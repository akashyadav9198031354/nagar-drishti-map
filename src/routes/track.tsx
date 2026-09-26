import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader } from "@/components/SiteHeader";
import { LazyMap } from "@/components/LazyMap";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl } from "@/lib/reports";
import { categoryOf, STATUSES, statusIndex, statusOf, timeAgo, type Report } from "@/lib/civic";

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ ref: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "मेरी शिकायत – स्थिति देखें | NagarDrishti" },
      { name: "description", content: "Track the status of your civic complaint using its NagarDrishti reference ID." },
      { property: "og:title", content: "Track your complaint – NagarDrishti" },
      { property: "og:description", content: "Enter your reference ID to see the status timeline and resolution evidence." },
    ],
  }),
  component: TrackPage,
});

type Rec = { id: string; status: string; note: string | null; evidence_image_path: string | null; created_at: string };

function TrackPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const [input, setInput] = useState(ref ?? "");

  const { data, isFetching } = useQuery({
    queryKey: ["track", ref],
    enabled: !!ref,
    queryFn: async () => {
      const { data: report } = await supabase.from("reports").select("*").eq("reference_id", ref!.trim().toUpperCase()).maybeSingle();
      if (!report) return null;
      const { data: recs } = await supabase.from("resolution_records").select("*").eq("report_id", report.id).order("created_at");
      return { report: report as Report, recs: (recs ?? []) as Rec[] };
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-4xl">मेरी शिकायत</h1>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/track", search: { ref: input.trim().toUpperCase() } });
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="संदर्भ नंबर, जैसे NG-000101"
            className="flex-1 rounded-xl border border-input bg-card p-4 text-lg uppercase"
          />
          <button className="rounded-xl bg-primary px-6 font-semibold text-primary-foreground">खोजें</button>
        </form>

        {isFetching && <p className="mt-8 text-muted-foreground">खोज रहे हैं…</p>}
        {ref && !isFetching && data === null && <p className="mt-8 text-destructive">इस नंबर की कोई शिकायत नहीं मिली।</p>}
        {data && <Detail report={data.report} recs={data.recs} />}
      </div>
    </div>
  );
}

function Detail({ report, recs }: { report: Report; recs: Rec[] }) {
  const cat = categoryOf(report.category);
  const idx = statusIndex(report.status);
  const [img, setImg] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  useEffect(() => {
    photoUrl(report.image_path).then(setImg);
    recs.forEach((r) => r.evidence_image_path && photoUrl(r.evidence_image_path).then((u) => u && setEvidence((e) => ({ ...e, [r.id]: u }))));
  }, [report.id]);

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">संदर्भ नंबर</p>
          <p className="font-display text-3xl text-primary">{report.reference_id}</p>
          <p className="mt-2 text-lg">{cat.icon} {cat.hi} <span className="text-muted-foreground">· {cat.en}</span></p>
          <p className="text-muted-foreground">{report.ward ?? ""} · {timeAgo(report.created_at)}</p>
        </div>
        <span className="rounded-full bg-secondary px-4 py-1.5 font-semibold text-secondary-foreground">{statusOf(report.status).hi}</span>
      </div>
      {report.description && <p className="mt-4 text-lg">“{report.description}”</p>}

      <ol className="mt-6 space-y-3">
        {STATUSES.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3">
            <span className={`grid h-8 w-8 place-items-center rounded-full border-2 ${i <= idx ? "bg-success border-success text-background" : "border-border text-muted-foreground"}`}>
              {i <= idx ? "✓" : "○"}
            </span>
            <span className={i <= idx ? "font-semibold" : "text-muted-foreground"}>{s.hi} <span className="text-sm font-normal text-muted-foreground">({s.en})</span></span>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {img && <img src={img} alt="शिकायत फोटो" className="h-56 w-full rounded-xl object-cover" />}
        <LazyMap reports={[report]} center={[report.latitude, report.longitude]} zoom={15} className="h-56" />
      </div>

      {recs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-2xl">अधिकारी अपडेट</h3>
          <ul className="mt-3 space-y-3">
            {recs.map((r) => (
              <li key={r.id} className="rounded-xl bg-muted p-3">
                <div className="font-semibold">{statusOf(r.status).hi} · <span className="font-normal text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString("hi-IN")}</span></div>
                {r.note && <p>{r.note}</p>}
                {evidence[r.id] && <img src={evidence[r.id]} alt="समाधान प्रमाण" className="mt-2 h-40 rounded-lg object-cover" />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
