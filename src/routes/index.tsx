import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/SiteHeader";
import { LazyMap } from "@/components/LazyMap";
import { reportsQuery } from "@/lib/reports";
import { buildClusters, CATEGORIES, DEFAULT_CENTER } from "@/lib/civic";

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
  const open = reports.filter((r) => r.status !== "resolved").length;
  const resolved = reports.length - open;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
        <div>
          <p className="text-sm font-semibold text-secondary tracking-wide">उत्तर प्रदेश · नागरिक समस्या मंच</p>
          <h1 className="mt-3 text-5xl md:text-6xl leading-[1.05] text-foreground">
            अपने शहर की समस्या<br />
            <span className="text-primary">फोटो खींचें, बताएं।</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-lg">
            जलभराव, कूड़ा, गड्ढे, खुले नाले या बंद स्ट्रीट लाइट — एक फोटो और स्थान से शिकायत दर्ज करें। AI श्रेणी पहचानता है, और एक जैसी शिकायतें एक साथ जुड़ती हैं।
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/report" className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-4 text-lg font-semibold text-primary-foreground shadow-md hover:opacity-90">
              📷 समस्या दर्ज करें
            </Link>
            <Link to="/track" className="inline-flex items-center gap-2 rounded-xl border-2 border-foreground/80 px-7 py-4 text-lg font-semibold text-foreground hover:bg-muted">
              🔎 मेरी शिकायत देखें
            </Link>
          </div>
          <dl className="mt-10 grid grid-cols-3 gap-4 max-w-md">
            {[
              ["कुल शिकायतें", reports.length],
              ["लंबित", open],
              ["हल हुईं", resolved],
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
          <p className="px-2 pt-3 text-sm text-muted-foreground">
            रंगीन घेरे = एक ही जगह की कई संबंधित शिकायतें (क्लस्टर)
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-3xl">आप क्या बता सकते हैं</h2>
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to="/report" search={{ category: c.id }} className="rounded-xl border border-border bg-card p-4 text-center hover:border-primary">
              <div className="text-3xl">{c.icon}</div>
              <div className="mt-2 font-semibold">{c.hi}</div>
              <div className="text-xs text-muted-foreground">{c.en}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 grid md:grid-cols-4 gap-6">
        {[
          ["1", "फोटो व स्थान", "फोटो लें और नक्शे पर जगह चुनें।"],
          ["2", "AI विश्लेषण", "AI फोटो व विवरण से श्रेणी पहचानता है।"],
          ["3", "क्लस्टर", "पास की एक जैसी शिकायतें एक साथ जुड़ती हैं।"],
          ["4", "समाधान ट्रैक", "संदर्भ ID से स्थिति देखें।"],
        ].map(([n, t, d]) => (
          <div key={n} className="rounded-xl bg-muted p-5">
            <div className="font-display text-4xl text-primary">{n}</div>
            <div className="mt-2 font-semibold text-lg">{t}</div>
            <p className="text-muted-foreground text-sm">{d}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        NagarDrishti · UP State Innovation Challenge 2026 · AI सुझाव निर्णय-सहायता हैं, अंतिम निर्णय अधिकारी का।
      </footer>
    </div>
  );
}
