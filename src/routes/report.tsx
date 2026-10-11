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
import { sevLabel, useLang, useT } from "@/lib/i18n";

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
  const { lang } = useLang();
  const t = useT();

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
    if (!navigator.geolocation) { toast.error(t("errGps")); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setPicked([p.coords.latitude, p.coords.longitude]),
      () => toast.error(t("errLoc")),
    );
  }

  async function runAi() {
    setAnalyzing(true);
    try {
      const imageDataUrl = file ? await fileToDataUrl(file) : undefined;
      const r = await classify({ data: { description, imageDataUrl } });
      if (!r.ok) { toast.error(r.error); return; }
      setAi(r);
      setCategory(r.category);
      setSeverity(r.severity);
    } catch {
      toast.error(t("errAi"));
    } finally {
      setAnalyzing(false);
    }
  }

  async function submit() {
    if (!picked) { toast.error(t("errNeedLoc")); return; }
    if (!category) { toast.error(t("errNeedCat")); return; }
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
      toast.error(t("errSubmit") + ": " + (e as Error).message);
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
          <h1 className="mt-4 text-4xl">{t("repDoneTitle")}</h1>
          <p className="mt-4 text-muted-foreground">{t("repRefIs")}</p>
          <p className="mt-1 font-display text-5xl text-primary tracking-wider">{done.ref}</p>
          {done.related > 0 && (
            <p className="mt-6 rounded-xl bg-accent p-4 text-accent-foreground">
              {lang === "hi" ? (
                <>इस जगह पर पहले से <b>{done.related}</b> संबंधित शिकायतें हैं — आपकी शिकायत उसी क्लस्टर में जुड़ गई है, जिससे प्राथमिकता बढ़ती है।</>
              ) : (
                <>There are already <b>{done.related}</b> related complaints here — yours joined the same cluster, raising its priority.</>
              )}
            </p>
          )}
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/track" search={{ ref: done.ref }} className="rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground">{t("repViewStatus")}</Link>
            <button onClick={() => location.reload()} className="rounded-xl border border-border px-6 py-3 font-semibold">{t("repNew")}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-4xl">{t("repTitle")}</h1>
        <p className="text-muted-foreground mt-1">{t("repSub")}</p>

        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Step n={1} title={t("repPhoto")}>
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card h-52 cursor-pointer hover:border-primary overflow-hidden">
                {preview ? (
                  <img src={preview} alt="photo" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <span className="text-5xl">📷</span>
                    <span className="mt-2 font-semibold">{t("repPhotoTap")}</span>
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

            <Step n={2} title={t("repDesc")}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder={t("repDescPh")}
                className="w-full rounded-xl border border-input bg-card p-3 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={runAi}
                disabled={analyzing || (!file && !description.trim())}
                className="mt-3 w-full rounded-xl bg-secondary px-4 py-3 font-semibold text-secondary-foreground disabled:opacity-50"
              >
                {analyzing ? t("repAiBusy") : t("repAiBtn")}
              </button>
              {ai && (
                <div className="mt-3 rounded-xl border border-secondary/40 bg-card p-3 text-sm">
                  <div className="font-semibold">
                    {t("repAiSuggest")}: {categoryOf(ai.category).icon} {categoryOf(ai.category).hi} ({categoryOf(ai.category).en})
                  </div>
                  <div className="text-muted-foreground">
                    {t("repAiConf")}: {Math.round(ai.confidence * 100)}% · {t("repAiSev")}: {sevLabel(lang, ai.severity)}
                  </div>
                  <div className="mt-1">{ai.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t("repAiChange")}</div>
                </div>
              )}
            </Step>

            <Step n={3} title={t("repCat")}>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`rounded-xl border-2 p-3 text-left ${category === c.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                  >
                    <span className="text-xl">{c.icon}</span> <span className="font-semibold">{lang === "hi" ? c.hi : c.en}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="font-semibold">{t("repSev")}</span>
                {[1, 2, 3].map((s) => (
                  <button key={s} onClick={() => setSeverity(s)} className={`rounded-lg px-3 py-1.5 border ${severity === s ? "bg-foreground text-background" : "border-border"}`}>
                    {sevLabel(lang, s)}
                  </button>
                ))}
              </div>
            </Step>
          </div>

          <div className="space-y-6">
            <Step n={4} title={t("repLoc")}>
              <button onClick={useGps} className="mb-3 w-full rounded-xl border-2 border-foreground/80 px-4 py-3 font-semibold hover:bg-muted">
                {t("repGps")}
              </button>
              <LazyMap
                reports={reports.filter((r) => !["resolved","verified"].includes(r.status))}
                center={picked ?? DEFAULT_CENTER}
                picked={picked}
                onPick={(lat, lng) => setPicked([lat, lng])}
                zoom={14}
                className="h-80"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {picked ? `${t("repPicked")}: ${picked[0].toFixed(5)}, ${picked[1].toFixed(5)}` : t("repPick")}
              </p>
              <input
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder={t("repWardPh")}
                className="mt-3 w-full rounded-xl border border-input bg-card p-3"
              />
              {related.length > 0 && (
                <div className="mt-3 rounded-xl bg-accent p-3 text-sm text-accent-foreground">
                  {lang === "hi" ? (
                    <>⚡ पास में (≤150 मी) इसी श्रेणी की <b>{related.length}</b> खुली शिकायतें मिलीं — आपकी शिकायत उसी क्लस्टर से जुड़ेगी।</>
                  ) : (
                    <>⚡ Found <b>{related.length}</b> open complaints of this category within 150 m — yours will join that cluster.</>
                  )}
                </div>
              )}
            </Step>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-xl bg-primary px-6 py-5 text-xl font-semibold text-primary-foreground shadow-md disabled:opacity-60"
            >
              {submitting ? t("repSubmitting") : t("repSubmit")}
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
