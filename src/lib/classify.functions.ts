import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const CATS = ["waterlogging", "garbage", "road_damage", "streetlight", "drainage", "open_drain", "other"] as const;

export const classifyIssue = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        description: z.string().max(2000).default(""),
        imageDataUrl: z.string().max(9_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false as const, error: "AI सेवा उपलब्ध नहीं है" };
    if (!data.description.trim() && !data.imageDataUrl) return { ok: false as const, error: "फोटो या विवरण दें" };

    const content: Array<Record<string, string>> = [
      {
        type: "input_text",
        text:
          "You classify civic issue reports from Uttar Pradesh, India (text may be Hindi or English). " +
          `Pick exactly one category from: ${CATS.join(", ")}. ` +
          "Also estimate severity 1 (minor) to 3 (urgent/safety risk) and give a one-line Hindi summary. " +
          `Citizen description: "${data.description}"`,
      },
    ];
    if (data.imageDataUrl) content.push({ type: "input_image", image_url: data.imageDataUrl });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning: { effort: "low" },
        input: [{ role: "user", content }],
        text: {
          format: {
            type: "json_schema",
            name: "classification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: { type: "string", enum: [...CATS] },
                confidence: { type: "number" },
                severity: { type: "integer" },
                summary_hi: { type: "string" },
              },
              required: ["category", "confidence", "severity", "summary_hi"],
            },
          },
        },
      }),
    });

    if (!res.ok) {
      const msg =
        res.status === 429
          ? "अभी बहुत अनुरोध हैं, थोड़ी देर बाद प्रयास करें"
          : res.status === 402
            ? "AI क्रेडिट समाप्त हो गए हैं"
            : "AI विश्लेषण विफल रहा";
      console.error("classify failed", res.status, await res.text().catch(() => ""));
      return { ok: false as const, error: msg, status: res.status };
    }
    const json = (await res.json()) as {
      output_text?: string;
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    };
    const text =
      json.output_text ??
      json.output?.flatMap((o) => o.content ?? []).find((c) => c.type === "output_text")?.text ??
      "";
    try {
      const parsed = JSON.parse(text) as { category: string; confidence: number; severity: number; summary_hi: string };
      return {
        ok: true as const,
        category: parsed.category,
        confidence: Math.max(0, Math.min(1, parsed.confidence > 1 ? parsed.confidence / 100 : parsed.confidence)),
        severity: Math.max(1, Math.min(3, Math.round(parsed.severity))),
        summary: parsed.summary_hi,
      };
    } catch {
      return { ok: false as const, error: "AI उत्तर समझ नहीं आया" };
    }
  });
