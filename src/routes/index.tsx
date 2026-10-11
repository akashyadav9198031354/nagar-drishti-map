import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { LazyMap } from "@/components/LazyMap";
import { reportsQuery } from "@/lib/reports";
import { buildClusters, CATEGORIES, DEFAULT_CENTER } from "@/lib/civic";
import { useLang, useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "नगरदृष्टि – NagarDrishti | उत्तर प्रदेश नागरिक समस्या मंच" },
      { name: "description", content: "Report waterlogging, garbage, potholes and more in Uttar Pradesh. AI-assisted civic issue intelligence and resolution tracking." },
      { property: "og:title", content: "NagarDrishti – Civic issue intelligence for UP" },
      { property: "og:description", content: "Report civic problems with a photo and location, track status, and see issue hotspots on a map." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: reports = [] } = useQuery(reportsQuery);
  const clusters = buildClusters(reports);
  const open = reports.filter((r) => !["resolved","verified"].includes(r.status)).length;
  const resolved = reports.length - open;
  const { lang } = useLang();
  const t = useT();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div>
          <p className="text-sm font-semibold text-secondary tracking-wide">{t("homeTag")}</p>
          <h1 className="mt-3 text-5xl md:text-6xl leading-[1.05] text-foreground">
            {t("homeH1a")}<br />
            <span className="text-primary">{t("homeH1b")}</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">{t("homeSub")}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/report" className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-lg font-semibold text-primary-foreground shadow-md hover:opacity-90">
              {t("homeCtaReport")}
            </Link>
            <Link to="/track" className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground/80 px-7 py-4 text-lg font-semibold text-foreground hover:bg-muted">
              {t("homeCtaTrack")}
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              [t("statTotal"), reports.length],
              [t("statOpen"), open],
              [t("statResolved"), resolved],
            ].map(([l, v]) => (
              <div key={l as string} className="border-l-4 border-primary pl-3">
                <dd className="text-3xl font-display">{v}</dd>
                <dt className="text-sm text-muted-foreground">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          <LazyMap reports={reports} clusters={clusters} center={DEFAULT_CENTER} zoom={12} className="h-[420px]" />
          <p className="px-2 pt-3 text-sm text-muted-foreground">{t("mapCaption")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-3xl">{t("homeCats")}</h2>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to="/report" search={{ category: c.id }} className="rounded-xl border border-border bg-card p-4 text-center hover:border-primary">
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-2 font-semibold">{lang === "hi" ? c.hi : c.en}</div>
              <div className="text-xs text-muted-foreground">{lang === "hi" ? c.en : c.hi}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-4 gap-6">
        {[
          ["1", t("step1t"), t("step1d")],
          ["2", t("step2t"), t("step2d")],
          ["3", t("step3t"), t("step3d")],
          ["4", t("step4t"), t("step4d")],
        ].map(([n, ti, d]) => (
          <div key={n} className="rounded-xl bg-muted p-5">
            <div className="font-display text-4xl text-primary">{n}</div>
            <div className="mt-2 font-semibold text-lg">{ti}</div>
            <p className="text-muted-foreground text-sm">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        {t("footer")}
      </footer>
    </div>
  );
}
