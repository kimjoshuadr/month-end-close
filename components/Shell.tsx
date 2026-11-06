"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "../state/store";
import { TopBar } from "./TopBar";

const NAV = [
  { href: "/", label: "Upload" },
  { href: "/entries", label: "Entries" },
  { href: "/open-items", label: "Open items", badge: true },
  { href: "/statements", label: "Statements" },
  { href: "/audit", label: "Audit log" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { computed } = useStore();
  return (
    <div className="shell">
      <nav className="sidenav" aria-label="Primary">
        <div className="brand">
          <img src="/notion-logo.png" alt="Notion CFO and Advisors" width={170} height={40} />
          <p className="eyebrow" style={{ color: "#9fb3cc", marginTop: 8 }}>
            Greenline Close
          </p>
        </div>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`navlink${pathname === n.href ? " active" : ""}`}>
            <span>{n.label}</span>
            {n.badge && computed && computed.unresolved > 0 && <span className="navbadge">{computed.unresolved}</span>}
          </Link>
        ))}
      </nav>
      <div className="main">
        <div className="topbar">
          <TopBar />
        </div>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
