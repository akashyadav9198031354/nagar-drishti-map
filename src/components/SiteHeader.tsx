import { Link } from "@tanstack/react-router";
import { useLang, useT } from "@/lib/i18n";

export function SiteHeader() {
  const { lang, setLang } = useLang();
  const t = useT();
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid place-items-center h-9 w-9 rounded-full bg-primary text-primary-foreground text-lg">👁</span>
          <span className="leading-tight">
            <span className="block font-display text-xl text-foreground">नगरदृष्टि</span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">NagarDrishti · UP</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-medium">
          <Link to="/report" className="px-3 py-2 rounded-md hover:bg-muted" activeProps={{ className: "bg-muted" }}>{t("navReport")}</Link>
          <Link to="/track" className="px-3 py-2 rounded-md hover:bg-muted" activeProps={{ className: "bg-muted" }}>{t("navTrack")}</Link>
          <Link to="/authority" className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90">{t("navAuthority")}</Link>
          <button
            onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            className="ml-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
            aria-label="Switch language"
          >
            {lang === "hi" ? "EN" : "हिंदी"}
          </button>
        </nav>
      </div>
    </header>
  );
}
