import Link from "next/link";

const NAV = [
  { href: "/", label: "Upload" },
  { href: "/entries", label: "Entries" },
  { href: "/open-items", label: "Open items" },
  { href: "/statements", label: "Statements" },
  { href: "/audit", label: "Audit log" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <nav className="sidenav">
        <img src="/notion-logo.png" alt="Notion CFO and Advisors" width={160} />
        <p className="eyebrow" style={{ color: "#9fb3cc" }}>
          Greenline Close
        </p>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href}>
            {n.label}
          </Link>
        ))}
        <div className="topmenu">
          <p className="eyebrow" style={{ color: "#9fb3cc" }}>
            Menu
          </p>
        </div>
      </nav>
      <div style={{ flex: 1 }}>
        <div className="topbar">
          <strong>Greenline Landscape Co., LLC</strong>
          <span>September 2026</span>
        </div>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
