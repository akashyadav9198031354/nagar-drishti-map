import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Session } from "@supabase/supabase-js";
import { SiteHeader } from "@/components/SiteHeader";
import { LazyMap } from "@/components/LazyMap";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, reportsQuery, uploadPhoto } from "@/lib/reports";
import { buildClusters, CATEGORIES, categoryOf, DEFAULT_CENTER, ESCALATION_HOURS, hoursSinceAction, isEscalated, mapLinks, STATUSES, statusIndex, statusOf, timeAgo, type Cluster, type Report } from "@/lib/civic";

export const Route = createFileRoute("/authority")({
  head: () => ({
    meta: [
      { title: "Authority Dashboard – NagarDrishti" },
      { name: "description", content: "Civic issue map, clusters, priority-support indicators and resolution tracking for UP authorities." },
      { property: "og:title", content: "Authority Dashboard – NagarDrishti" },
      { property: "og:description", content: "Unified map of civic issues, duplicate clusters and status controls." },
    ],
  }),
  component: AuthorityPage,
});

function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

function AuthorityPage() {
  const { session, ready } = useSession();
  const { data: isAuthority, isLoading } = useQuery({
    queryKey: ["role", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", session!.user.id);
      return !!data?.some((r) => r.role === "authority");
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader />
      {!ready || (session && isLoading) ? (
        <p className="p-10 text-center text-muted-foreground">लोड हो रहा है…</p>
      ) : !session ? (
        <Login />
      ) : !isAuthority ? (
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="text-3xl">पहुँच नहीं है</h1>
          <p className="mt-3 text-muted-foreground">यह खाता अधिकारी के रूप में पंजीकृत नहीं है।</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-6 rounded-xl border border-border px-5 py-2">साइन आउट</button>
        </div>
      ) : (
        <Dashboard userId={session.user.id} email={session.user.email ?? ""} />
      )}
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [govtId, setGovtId] = useState("");
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error, data } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { govt_id: govtId.trim() }, emailRedirectTo: `${location.origin}/authority` },
          });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (mode === "up" && !data.session) toast.success("ईमेल में पुष्टि लिंक भेजा गया है");
  }
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-4xl">अधिकारी लॉगिन</h1>
      <p className="mt-2 text-muted-foreground">Authority / field team sign-in — सिर्फ़ सरकारी ID से</p>
      <form onSubmit={go} className="mt-8 space-y-3">
        {mode === "up" && (
          <input required value={govtId} onChange={(e) => setGovtId(e.target.value)} placeholder="सरकारी ID (जैसे UP-GOV-2026-001)" className="w-full rounded-xl border border-input bg-card p-3" />
        )}
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-input bg-card p-3" />
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full rounded-xl border border-input bg-card p-3" />
        <button disabled={busy} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {mode === "in" ? "साइन इन" : "खाता बनाएं"}
        </button>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">अधिकारी खाता सिर्फ़ सरकार द्वारा जारी ID से बनता है। बिना मान्य ID के खाता आम नागरिक रहता है।</p>
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-4 text-sm text-secondary underline">
        {mode === "in" ? "नया खाता बनाएं" : "पहले से खाता है? साइन इन"}
      </button>
    </div>
  );
}

function Dashboard({ userId, email }: { userId: string; email: string }) {
  const { data: reports = [] } = useQuery(reportsQuery);
  const [cat, setCat] = useState("all");
  const [ward, setWard] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<Report | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);

  const wards = useMemo(() => [...new Set(reports.map((r) => r.ward).filter(Boolean))] as string[], [reports]);
  const filtered = reports.filter(
    (r) =>
      (cat === "all" || r.category === cat) &&
      (ward === "all" || r.ward === ward) &&
      (status === "all" || (status === "escalated" ? isEscalated(r) : r.status === status)),
  );
  const clusters = buildClusters(filtered);
  const multi = clusters.filter((c) => c.reports.length > 1);

  const counts = {
    total: filtered.length,
    pending: filtered.filter((r) => ["reported", "under_review", "assigned"].includes(r.status)).length,
    progress: filtered.filter((r) => r.status === "in_progress").length,
    resolved: filtered.filter((r) => r.status === "resolved" || r.status === "verified").length,
  };
  const byCat = CATEGORIES.map((c) => ({ ...c, n: filtered.filter((r) => r.category === c.id).length })).filter((c) => c.n);
  const maxCat = Math.max(1, ...byCat.map((c) => c.n));
  const byWard = wards.map((w) => ({ w, n: filtered.filter((r) => r.ward === w && r.status !== "resolved" && r.status !== "verified").length })).sort((a, b) => b.n - a.n);

  const escalatedList = filtered.filter((r) => isEscalated(r)).sort((a, b) => hoursSinceAction(b) - hoursSinceAction(a));
  const list = useMemo(() => {
    const arr = [...(cluster ? cluster.reports : filtered)];
    return arr.sort((a, b) => Number(isEscalated(b)) - Number(isEscalated(a)) || b.created_at.localeCompare(a.created_at));
  }, [cluster, filtered]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">अधिकारी डैशबोर्ड</h1>
          <p className="text-muted-foreground">{email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="rounded-xl border border-border px-4 py-2 text-sm">साइन आउट</button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["कुल शिकायतें", "Total", counts.total, "border-foreground"],
          ["लंबित", "Pending", counts.pending, "border-destructive"],
          ["कार्य जारी", "In progress", counts.progress, "border-warning"],
          ["हल हुईं", "Resolved", counts.resolved, "border-success"],
        ].map(([hi, en, n, b]) => (
          <div key={en as string} className={`rounded-xl bg-card border border-border border-l-4 ${b} p-4`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{en}</div>
            <div className="font-display text-4xl">{n}</div>
            <div className="text-sm">{hi}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Select value={cat} onChange={setCat} options={[["all", "सभी श्रेणियाँ"], ...CATEGORIES.map((c) => [c.id, `${c.icon} ${c.hi}`] as [string, string])]} />
        <Select value={ward} onChange={setWard} options={[["all", "सभी वार्ड"], ...wards.map((w) => [w, w] as [string, string])]} />
        <Select value={status} onChange={setStatus} options={[["all", "सभी स्थितियाँ"], ["escalated", `⚠ उच्चस्तरीय भेजी गई (${ESCALATION_HOURS}घं+)`], ...STATUSES.map((s) => [s.id, s.hi] as [string, string])]} />
      </div>

      <div className="mt-4 grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-card p-3">
          <LazyMap reports={filtered} clusters={clusters} center={DEFAULT_CENTER} zoom={12} className="h-[460px]" onSelectCluster={setCluster} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-2xl">इश्यू क्लस्टर</h2>
          <p className="text-xs text-muted-foreground">एक ही श्रेणी, ≤150 मी · प्राथमिकता = सघनता + नवीनता + गंभीरता + प्रमाण (निर्णय-सहायता)</p>
          <ul className="mt-3 space-y-2 max-h-[390px] overflow-auto">
            {multi.length === 0 && <li className="text-muted-foreground">कोई क्लस्टर नहीं</li>}
            {multi.map((c) => {
              const cc = categoryOf(c.category);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setCluster(cluster?.id === c.id ? null : c)}
                    className={`w-full rounded-xl border p-3 text-left ${cluster?.id === c.id ? "border-primary bg-primary/10" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{cc.icon} {cc.hi} · {c.ward ?? "—"}</span>
                      <PriorityBadge p={c.priority} />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {c.reports.length} संबंधित शिकायतें · {c.recent} पिछले 48 घंटे · स्कोर {c.score}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-2xl border border-border bg-card p-4 overflow-x-auto">
          {escalatedList.length > 0 && (
            <div className="mb-3 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm">
              <b>⚠ उच्चस्तरीय अधिकारी को भेजी गई: {escalatedList.length} शिकायतें</b>
              <p className="mt-0.5 text-xs text-muted-foreground">{ESCALATION_HOURS} घंटे से अधिक समय तक बिना किसी कार्रवाई — इन्हें सबसे पहले देखें। कार्रवाई होते ही यह फ़्लैग हट जाएगा।</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {escalatedList.map((r) => (
                  <button key={r.id} onClick={() => setSelected(r)} className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-semibold text-destructive-foreground">
                    {r.reference_id} · {hoursSinceAction(r)} घं
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl">{cluster ? "क्लस्टर की शिकायतें" : "हाल की शिकायतें"}</h2>
            {cluster && <button onClick={() => setCluster(null)} className="text-sm underline">सभी दिखाएँ</button>}
          </div>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2">ID</th><th>श्रेणी</th><th>वार्ड</th><th>स्थान</th><th>AI</th><th>स्थिति</th><th>समय</th><th /></tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 font-mono">{r.reference_id}</td>
                  <td>{categoryOf(r.category).icon} {categoryOf(r.category).hi}</td>
                  <td>{r.ward ?? "—"}</td>
                  <td className="whitespace-nowrap font-mono text-xs">
                    <a href={mapLinks(r.latitude, r.longitude).google} target="_blank" rel="noreferrer" className="text-secondary underline" title="Google Maps में सटीक स्थान खोलें">
                      📍 {r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
                    </a>
                  </td>
                  <td>{r.ai_confidence != null ? `${Math.round(Number(r.ai_confidence) * 100)}%` : "—"}</td>
                  <td>
                    <span className="rounded-full bg-muted px-2 py-0.5">{statusOf(r.status).hi}</span>
                    {isEscalated(r) && <span className="ml-1 whitespace-nowrap rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-destructive-foreground">उच्चस्तरीय</span>}
                  </td>
                  <td className="text-muted-foreground">{timeAgo(r.created_at)}</td>
                  <td><button onClick={() => setSelected(r)} className="rounded-lg bg-secondary px-3 py-1 text-secondary-foreground">अपडेट</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-2xl">श्रेणी वितरण</h2>
            <ul className="mt-3 space-y-2">
              {byCat.map((c) => (
                <li key={c.id}>
                  <div className="flex justify-between text-sm"><span>{c.icon} {c.hi}</span><span>{c.n}</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(c.n / maxCat) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-2xl">वार्ड-वार लंबित</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {byWard.map((w) => (
                <li key={w.w} className="flex justify-between border-b border-border py-1"><span>{w.w}</span><b>{w.n}</b></li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {selected && <UpdatePanel report={selected} userId={userId} onClose={() => setSelected(null)} />}
    </div>
  );
}

type Rec = { id: string; status: string; note: string | null; evidence_image_path: string | null; created_at: string };

function UpdatePanel({ report, userId, onClose }: { report: Report; userId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(report.status);
  const [category, setCategory] = useState(report.category);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [img, setImg] = useState<string | null>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});

  async function loadHistory() {
    const { data } = await supabase.from("resolution_records").select("*").eq("report_id", report.id).order("created_at");
    const list = (data ?? []) as Rec[];
    setRecs(list);
    list.forEach((r) => r.evidence_image_path && photoUrl(r.evidence_image_path).then((u) => u && setUrls((m) => ({ ...m, [r.id]: u }))));
  }
  useEffect(() => { photoUrl(report.image_path).then(setImg); loadHistory(); }, [report.id]);

  async function save(override?: { status: string; note: string }) {
    const st = override?.status ?? status;
    const nt = override?.note ?? note;
    setBusy(true);
    try {
      const { error: e1 } = await supabase.from("reports").update({ status: st, category, updated_at: new Date().toISOString() }).eq("id", report.id);
      if (e1) throw e1;
      const paths = await Promise.all(files.map((f) => uploadPhoto(f, "resolutions")));
      const rows = paths.length
        ? paths.map((p, i) => ({ report_id: report.id, status: st, note: i === 0 ? nt || null : null, evidence_image_path: p as string | null, updated_by: userId }))
        : [{ report_id: report.id, status: st, note: nt || null, evidence_image_path: null, updated_by: userId }];
      const { error: e2 } = await supabase.from("resolution_records").insert(rows);
      if (e2) throw e2;
      toast.success("अपडेट सहेजा गया");
      qc.invalidateQueries({ queryKey: ["reports"] });
      setStatus(st); setNote(""); setFiles([]);
      loadHistory();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const idx = statusIndex(status);
  const current = statusIndex(report.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/40" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-auto bg-background p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between">
          <h2 className="text-3xl">{report.reference_id}</h2>
          <button onClick={onClose} className="text-2xl">×</button>
        </div>
        <p className="mt-2">{report.description}</p>
        {img && <img src={img} alt="शिकायत फोटो" className="mt-3 h-48 w-full rounded-xl object-cover" />}
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <b>📍 सटीक स्थान / Exact location</b>
          <div className="mt-1 font-mono">{report.latitude.toFixed(6)}, {report.longitude.toFixed(6)}</div>
          <div className="mt-1 flex flex-wrap gap-3">
            <a href={mapLinks(report.latitude, report.longitude).google} target="_blank" rel="noreferrer" className="text-secondary underline">Google Maps में खोलें ↗</a>
            <a href={mapLinks(report.latitude, report.longitude).osm} target="_blank" rel="noreferrer" className="text-secondary underline">ओपन स्ट्रीट मैप ↗</a>
          </div>
          {report.ward && <div className="mt-1 text-muted-foreground">वार्ड: {report.ward}</div>}
        </div>
        {isEscalated(report) && (
          <p className="mt-3 rounded-xl border border-destructive bg-destructive/10 p-3 text-sm">
            ⚠ {hoursSinceAction(report)} घंटे से कोई कार्रवाई नहीं — यह शिकायत उच्चस्तरीय अधिकारी को भेज दी गई है।
          </p>
        )}
        {report.ai_category && (
          <p className="mt-3 text-sm text-muted-foreground">AI सुझाव: {categoryOf(report.ai_category).hi} ({Math.round(Number(report.ai_confidence ?? 0) * 100)}%)</p>
        )}

        <h3 className="mt-5 text-xl">कार्य की प्रगति / Progress</h3>
        <ol className="mt-2 space-y-2">
          {STATUSES.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs ${i <= current ? "border-success bg-success text-background" : "border-border text-muted-foreground"}`}>{i <= current ? "✓" : i + 1}</span>
              <span className={i <= current ? "font-semibold" : "text-muted-foreground"}>{s.hi} ({s.en})</span>
            </li>
          ))}
        </ol>

        <h3 className="mt-5 text-xl">पूरा इतिहास व फोटो</h3>
        {recs.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">अभी कोई अपडेट नहीं।</p>
        ) : (
          <ul className="mt-2 space-y-2 border-l-2 border-border pl-3">
            {recs.map((r) => (
              <li key={r.id} className="rounded-lg bg-muted p-2 text-sm">
                <div className="font-semibold">{statusOf(r.status).hi} <span className="font-normal text-muted-foreground">· {new Date(r.created_at).toLocaleString("hi-IN")}</span></div>
                {r.note && <p>{r.note}</p>}
                {urls[r.id] && <a href={urls[r.id]} target="_blank" rel="noreferrer"><img src={urls[r.id]} alt="कार्य फोटो" className="mt-1 h-32 w-full rounded-md object-cover" /></a>}
              </li>
            ))}
          </ul>
        )}

        {report.status === "resolved" && (
          <button onClick={() => save({ status: "verified", note: note || "मौके पर जाँच कर कार्य सत्यापित किया गया" })} disabled={busy} className="mt-5 w-full rounded-xl bg-success py-3 font-semibold text-background disabled:opacity-60">
            ✓ कार्य सत्यापित करें (Verify)
          </button>
        )}

        <h3 className="mt-6 text-xl">नया अपडेट जोड़ें</h3>
        <label className="mt-2 block text-sm font-semibold">श्रेणी (सुधारें)</label>
        <Select value={category} onChange={setCategory} options={CATEGORIES.map((c) => [c.id, `${c.icon} ${c.hi}`] as [string, string])} />
        <label className="mt-4 block text-sm font-semibold">स्थिति (चरण)</label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {STATUSES.map((s, i) => (
            <button key={s.id} onClick={() => setStatus(s.id)} className={`rounded-lg border p-2 text-sm ${status === s.id ? "border-primary bg-primary/10 font-semibold" : i < idx ? "border-success/50" : "border-border"}`}>{s.hi}</button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold">टिप्पणी</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-input bg-card p-3" placeholder="जैसे: टीम मौके पर पहुँची, काम शुरू हुआ" />
        <label className="mt-4 block text-sm font-semibold">काम की फोटो (एक से ज़्यादा चुन सकते हैं)</label>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="mt-1 text-sm" />
        {files.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{files.length} फोटो चुनी गईं</p>}
        <button onClick={() => save()} disabled={busy} className="mt-6 w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "सहेज रहे हैं…" : "अपडेट सहेजें"}
        </button>
      </div>
    </div>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const cls = p === "High" ? "bg-destructive text-destructive-foreground" : p === "Medium" ? "bg-warning text-foreground" : "bg-muted text-foreground";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{p === "High" ? "उच्च" : p === "Medium" ? "मध्यम" : "कम"}</span>;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 rounded-xl border border-input bg-card px-3 py-2">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
}
