"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "../state/store";
import { ChatDrawer } from "./ChatDrawer";
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
  const [askOpen, setAskOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="shell">
      <nav className={`sidenav${menuOpen ? " open" : ""}`} aria-label="Primary">
        <div className="brand">
          <p className="eyebrow" style={{ color: "#9fb3cc", margin: 0 }}>
            Month-end close
          </p>
          <p className="wordmark">Close Desk</p>
        </div>
        <button className="menubtn" aria-expanded={menuOpen} aria-controls="navlinks" onClick={() => setMenuOpen((o) => !o)}>
          {menuOpen ? "Close" : "Menu"}
        </button>
        <div className="navlinks" id="navlinks">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`navlink${pathname === n.href ? " active" : ""}`}>
              <span>{n.label}</span>
              {n.badge && computed && computed.unresolved > 0 && <span className="navbadge">{computed.unresolved}</span>}
            </Link>
          ))}
          <button className="navlink askbtn" onClick={() => { setMenuOpen(false); setAskOpen(true); }}>
            <span>Ask AI</span>
          </button>
        </div>
      </nav>
      <div className="main">
        <div className="topbar">
          <TopBar />
        </div>
        <main className="content">{children}</main>
      </div>
      <ChatDrawer open={askOpen} onClose={() => setAskOpen(false)} />
    </div>
  );
}
