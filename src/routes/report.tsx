import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteHeader } from "@/components/SiteHeader";
import { LazyMap } from "@/components/LazyMap";
import { supabase } from "@/integrations/supabase/client";
import { classifyIssue } from "@/lib/classify.functions";
import { fileToDataUrl, reportsQuery, uploadPhoto } from "@/lib/reports";
import { CATEGORIES, categoryOf, DEFAULT_CENTER, findRelated } from "@/lib/civic";

export const Route = createFileRoute("/report")({
  validateSearch: z.object({ category: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "समस्या दर्ज करें – NagarDrishti" },
      { name: "description", content: "Report a civic issue in Uttar Pradesh with a photo, location and short description." },
      { property: "og:title", content: "Report a civic issue – NagarDrishti" },
      { property: "og:description", content: "Photo + location + description. AI identifies the category automatically." },
    ],
  }),
  component: ReportPage,
});

type AI = { category: string; confidence: number; severity: number; summary: string };

function ReportPage() {
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { data: reports = [] } = useQuery(reportsQuery);
  const classify = useServerFn(classifyIssue);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(search.category ?? "");
  const [severity, setSeverity] = useState(2);
  const [ward, setWard] = useState("");
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [ai, setAi] = useState<AI | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ ref: string; related: number } | null>(null);

  const related = picked && category ? findRelated(reports, picked[0], picked[1], category) : [];

  function useGps() {
    if (!navigator.geolocation) return toast.error("GPS उपलब्ध नहीं — नक्शे पर जगह चुनें");
    navigator.geolocation.getCurrentPosition(
      (p) => setPicked([p.coords.latitude, p.coords.longitude]),
      () => toast.error("स्थान नहीं मिला — नक्शे पर टैप करें"),
    );
  }

  async function runAi() {
    setAnalyzing(true);
    try {
      const imageDataUrl = file ? await fileToDataUrl(file) : undefined;
      const r = await classify({ data: { description, imageDataUrl } });
      if (!r.ok) return toast.error(r.error);
      setAi(r);
      setCategory(r.category);
      setSeverity(r.severity);
    } catch {
      toast.error("AI विश्लेषण विफल रहा");
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit() {
    if (!picked) return toast.error("कृपया स्थान चुनें");
    if (!category) return toast.error("कृपया श्रेणी चुनें");
    setSubmitting(true);
    try {
      const image_path = file ? await uploadPhoto(file) : null;
      const { data, error } = await supabase
        .from("reports")
        .insert({
          category,
          description,
          latitude: picked[0],
          longitude: picked[1],
          ward: ward || null,
          image_path,
          severity,
          ai_category: ai?.category ?? null,
          ai_confidence: ai?.confidence ?? null,
        })
        .select("reference_id")
        .single();
      if (error) throw error;
      setDone({ ref: data.reference_id, related: related.length });
      qc.invalidateQueries({ queryKey: ["reports"] });
    } catch (e) {
      toast.error("शिकायत दर्ज नहीं हो सकी: " + (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <div className="text-6xl">✅</div>
          <h1 className="mt-4 text-4xl">शिकायत दर्ज हो गई</h1>
          <p className="mt-4 text-muted-foreground">आपका संदर्भ नंबर</p>
          <p className="mt-1 font-display text-5xl text-primary tracking-wider">{done.ref}</p>
          {done.related > 0 && (
            <p className="mt-6 rounded-xl bg-accent p-4 text-accent-foreground">
              इस जगह पर पहले से <b>{done.related}</b> संबंधित शिकायतें हैं — आपकी शिकायत उसी क्लस्टर में जुड़ गई है, जिससे प्राथमिकता बढ़ती है।
            </p>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/track" search={{ ref: done.ref }} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">स्थिति देखें</Link>
            <button onClick={() => location.reload()} className="rounded-xl border border-border px-6 py-3 font-semibold">नई शिकायत</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-4xl">समस्या बताएं</h1>
        <p className="text-muted-foreground mt-1">चार आसान कदम — फोटो, स्थान, श्रेणी, विवरण</p>

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Step n={1} title="फोटो लें / चुनें">
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card h-52 cursor-pointer hover:border-primary overflow-hidden">
                {preview ? (
                  <img src={preview} alt="चुनी गई फोटो" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="text-5xl">📷</span>
                    <span className="mt-2 font-semibold">फोटो जोड़ने के लिए टैप करें</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setFile(f);
                    setPreview(URL.createObjectURL(f));
                    setAi(null);
                  }}
                />
              </label>
            </Step>

            <Step n={2} title="क्या समस्या है? (विवरण)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="जैसे: बारिश के बाद सड़क पर बहुत पानी भर गया है"
                className="w-full rounded-xl border border-input bg-card p-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={runAi}
                disabled={analyzing || (!file && !description.trim())}
                className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground disabled:opacity-50"
              >
                {analyzing ? "AI विश्लेषण कर रहा है…" : "✨ AI से श्रेणी पहचानें"}
              </button>
              {ai && (
                <div className="mt-3 rounded-xl border border-secondary/40 bg-card p-3 text-sm">
                  <div className="font-semibold">
                    AI सुझाव: {categoryOf(ai.category).icon} {categoryOf(ai.category).hi} ({categoryOf(ai.category).en})
                  </div>
                  <div className="text-muted-foreground">
                    विश्वास: {Math.round(ai.confidence * 100)}% · गंभीरता: {["", "कम", "मध्यम", "अधिक"][ai.severity]}
                  </div>
                  <div className="mt-1">{ai.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">आप नीचे श्रेणी बदल सकते हैं।</div>
                </div>
              )}
            </Step>

            <Step n={3} title="श्रेणी">
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`rounded-xl border-2 p-3 text-left ${category === c.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <span className="text-xl">{c.icon}</span> <span className="font-semibold">{c.hi}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="font-semibold">गंभीरता:</span>
                {[1, 2, 3].map((s) => (
                  <button key={s} onClick={() => setSeverity(s)} className={`rounded-lg px-3 py-1.5 border ${severity === s ? "bg-foreground text-background" : "border-border"}`}>
                    {["", "कम", "मध्यम", "अधिक"][s]}
                  </button>
                ))}
              </div>
            </Step>
          </div>

          <div className="space-y-6">
            <Step n={4} title="स्थान चुनें">
              <button onClick={useGps} className="mb-3 w-full rounded-xl border-2 border-foreground/80 px-4 py-3 font-semibold hover:bg-muted">
                📍 मेरा वर्तमान स्थान
              </button>
              <LazyMap
                reports={reports.filter((r) => r.status !== "resolved")}
                center={picked ?? DEFAULT_CENTER}
                picked={picked}
                onPick={(lat, lng) => setPicked([lat, lng])}
                zoom={14}
                className="h-80"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {picked ? `चुना गया: ${picked[0].toFixed(5)}, ${picked[1].toFixed(5)}` : "नक्शे पर टैप करके सही जगह चुनें"}
              </p>
              <input
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="वार्ड / मोहल्ला (वैकल्पिक)"
                className="mt-3 w-full rounded-xl border border-input bg-card p-3"
              />
              {related.length > 0 && (
                <div className="mt-3 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
                  ⚡ पास में ({"≤"}150 मी) इसी श्रेणी की <b>{related.length}</b> खुली शिकायतें मिलीं — आपकी शिकायत उसी क्लस्टर से जुड़ेगी।
                </div>
              )}
            </Step>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-6 py-5 text-xl font-semibold text-primary-foreground shadow-md disabled:opacity-60"
            >
              {submitting ? "दर्ज हो रही है…" : "शिकायत दर्ज करें"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-3 text-xl font-sans font-semibold">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground text-base">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}
