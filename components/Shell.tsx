"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { firstRowForAccount } from "../lib/trace";
import { useStore } from "../state/store";
import { ajeNo } from "./format";
import { ChatDrawer } from "./ChatDrawer";
import { DrillDown } from "./DrillDown";
import { DrillProvider } from "./erp-ui";
import { IconChat, IconSearch } from "./icons";
import { SummaryStrip } from "./SummaryStrip";

const TABS = [
  { href: "/", label: "Close Packet" },
  { href: "/entries", label: "Journal Entries" },
  { href: "/open-items", label: "Open Items", badge: true },
  { href: "/statements", label: "Financial Statements" },
  { href: "/audit", label: "Audit Trail" },
];

type Hit =
  | { kind: "Entry"; id: string; label: string; href: string }
  | { kind: "Flag"; id: string; label: string; href: string }
  | { kind: "Account"; id: string; label: string; href: string };

function GlobalSearch() {
  const { computed } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const hits = useMemo<Hit[]>(() => {
    const t = q.trim().toLowerCase();
    if (!computed || t.length < 2) return [];
    const out: Hit[] = [];
    for (const a of computed.proposal.ajes) {
      if (a.title.toLowerCase().includes(t) || a.id.includes(t)) {
        out.push({ kind: "Entry", id: a.id, label: `${ajeNo(a.id)} · ${a.title}`, href: `/entries?sel=${a.id}` });
      }
    }
    for (const f of computed.proposal.flags) {
      if (f.title.toLowerCase().includes(t) || f.id.includes(t)) {
        out.push({ kind: "Flag", id: f.id, label: f.title, href: `/open-items?sel=${f.id}` });
      }
    }
    for (const r of computed.adjTb) {
      if (String(r.no).includes(t) || r.name.toLowerCase().includes(t)) {
        const ref = firstRowForAccount(computed, r.no);
        out.push({ kind: "Account", id: String(r.no), label: `${r.no} ${r.name}`, href: ref ? `/statements?acct=${r.no}` : "/statements" });
      }
    }
    return out.slice(0, 9);
  }, [q, computed]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="gsearch" ref={boxRef}>
      <IconSearch size={14} />
      <input
        type="text"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-label="Global search entries, flags, accounts"
        placeholder="Search entries, flags, accounts…"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        onFocus={() => setOpen(true)}
      />
      {open && hits.length > 0 && (
        <div className="gresults" role="listbox">
          {hits.map((h) => (
            <button key={`${h.kind}:${h.id}`} role="option" aria-selected={false} onClick={() => { setOpen(false); setQ(""); router.push(h.href); }}>
              <span className="g-kind">{h.kind}</span><span>{h.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Breadcrumb + title + status + per-page toolbar.
export function PageHeader({ crumb, title, final, unresolved, empty, toolbar }: { crumb: string; title: string; final: boolean; unresolved: number; empty?: boolean; toolbar?: React.ReactNode }) {
  return (
    <>
      <nav className="crumb" aria-label="Breadcrumb">Close / Sep 2026 / <span>{crumb}</span></nav>
      <div className="headrow">
        <h1>{title}</h1>
        {empty ? (
          <span className="lozenge nopacket">No packet</span>
        ) : (
          <span className={`lozenge ${final ? "final" : "draft"}`}>{final ? "Final" : `Draft · ${unresolved} open`}</span>
        )}
        <div className="toolbar">{toolbar}</div>
      </div>
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { computed } = useStore();
  const [chatOpen, setChatOpen] = useState(false);
  const unresolved = computed?.unresolved ?? 0;
  return (
    <div>
      <header className="topnav">
      <div className="appbar">
        <span className="wordmark">Close Desk</span>
        <GlobalSearch />
        <div className="entity"><strong className="ename">Greenline Landscape Co., LLC</strong><span className="period-tag">Sep 2026</span></div>
        <div className="spacer" />
        <button className="btn-top accent" onClick={() => setChatOpen(true)}><IconChat size={14} /><span className="lbl">Ask AI</span></button>
      </div>
      <nav className="modtabs" aria-label="Modules">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={pathname === t.href ? "active" : ""} aria-current={pathname === t.href ? "page" : undefined}>
            {t.label}
            {t.badge && computed && unresolved > 0 && <span className="countbadge">{unresolved}</span>}
          </Link>
        ))}
      </nav>
      </header>
      <main className="page">{children}</main>
      <DrillDown />
      {chatOpen && <ChatDrawer onClose={() => setChatOpen(false)} />}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <DrillProvider>
      <Frame>{children}</Frame>
    </DrillProvider>
  );
}

export { SummaryStrip };
