import { Link } from "@tanstack/react-router";

export function SiteHeader() {
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
          <Link to="/report" className="px-3 py-2 rounded-md hover:bg-muted" activeProps={{ className: "bg-muted" }}>समस्या दर्ज करें</Link>
          <Link to="/track" className="px-3 py-2 rounded-md hover:bg-muted" activeProps={{ className: "bg-muted" }}>मेरी शिकायत</Link>
          <Link to="/authority" className="px-3 py-2 rounded-md bg-secondary text-secondary-foreground hover:opacity-90">अधिकारी</Link>
        </nav>
      </div>
    </header>
  );
}
