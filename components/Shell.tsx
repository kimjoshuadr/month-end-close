"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStore } from "../state/store";
import { ChatDrawer } from "./ChatDrawer";
import { AuditDrawer, TraceDrawer } from "./drawers";
import { IconChat, IconCheck, IconClock, IconLock, IconMenu, IconX } from "./icons";
import { LivePreview, PreviewBar } from "./LivePreview";
import { UIProvider, useUI } from "./studio";

const STEPS = [
  { href: "/", label: "Packet read", short: "Packet" },
  { href: "/entries", label: "Entries drafted", short: "Entries" },
  { href: "/decisions", label: "Your decisions", short: "Decide" },
  { href: "/statements", label: "Statements", short: "File" },
];

function stepState(href: string, pathname: string, loaded: boolean, unresolved: number, final: boolean): "done" | "current" | "todo" | "locked" {
  if (!loaded && href !== "/") return "locked";
  if (href === "/decisions" && unresolved === 0 && loaded) return "done";
  if (href === "/statements" && final) return "done";
  if (href === "/" && loaded) return "done";
  if (href === "/entries" && loaded) return "done";
  if (pathname === href || (href !== "/" && pathname.startsWith(href))) return "current";
  if (pathname === href) return "current";
  return "todo";
}

function Rail() {
  const pathname = usePathname();
  const { computed, final } = useStore();
  const loaded = !!computed;
  const unresolved = computed?.unresolved ?? 7;
  const [open, setOpen] = useState(false);
  return (
    <nav className={`rail${open ? " open" : ""}`} aria-label="Close steps">
      <div className="rail-brand">
        <div>
          <p className="eyebrow light">Month-end close</p>
          <p className="wordmark">Close Desk</p>
        </div>
        <button className="menubtn" aria-expanded={open} aria-controls="railsteps" onClick={() => setOpen((o) => !o)}>
          {open ? <IconX /> : <IconMenu />}<span className="sr">Steps</span>
        </button>
      </div>
      <ol className="rail-steps" id="railsteps">
        {STEPS.map((s, i) => {
          const st = stepState(s.href, pathname, loaded, unresolved, final);
          const active = pathname === s.href;
          return (
            <li key={s.href} className={`step ${st}${active ? " active" : ""}`}>
              {st === "locked" ? (
                <span className="step-link" aria-disabled="true">
                  <span className="step-num"><IconLock size={14} /></span>
                  <span className="step-text"><span className="step-kicker">Step {i + 1}</span><span className="step-label">{s.label}</span></span>
                </span>
              ) : (
                <Link href={s.href} className="step-link" onClick={() => setOpen(false)} aria-current={active ? "step" : undefined}>
                  <span className="step-num">{st === "done" ? <IconCheck size={14} /> : <span>{i + 1}</span>}</span>
                  <span className="step-text"><span className="step-kicker">Step {i + 1}</span><span className="step-label">{s.label}</span></span>
                  {s.href === "/decisions" && loaded && unresolved > 0 && <span className="navbadge">{unresolved}</span>}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <p className="rail-note">Greenline Landscape Co., LLC · September 2026</p>
    </nav>
  );
}

function Header() {
  const { setAuditOpen, setAskOpen } = useUI();
  return (
    <header className="tophead">
      <div>
        <p className="eyebrow">Greenline Landscape Co., LLC</p>
        <h1 className="head-title">September 2026 close</h1>
      </div>
      <div className="head-actions">
        <button className="btn-ghost small" onClick={() => setAuditOpen(true)}>
          <IconClock size={15} /> Audit log
        </button>
        <button className="btn-primary small" onClick={() => setAskOpen(true)}>
          <IconChat size={15} /> Ask AI
        </button>
      </div>
    </header>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { computed } = useStore();
  const { trace, closeTrace, auditOpen, askOpen, setAskOpen } = useUI();
  const [sheetOpen, setSheetOpen] = useState(false);
  const paper = pathname === "/statements";
  return (
    <div className="studio">
      <Rail />
      <div className="main">
        <Header />
        <div className={`workspace${paper ? " paper-mode" : ""}`}>
          <main className="content">{children}</main>
          {!paper && <LivePreview computed={computed} />}
        </div>
        {!paper && <PreviewBar computed={computed} onExpand={() => setSheetOpen(true)} />}
      </div>
      {trace && <TraceDrawer traceKey={trace} onClose={closeTrace} />}
      {auditOpen && <AuditDrawer />}
      {askOpen && <ChatDrawer onClose={() => setAskOpen(false)} />}
      {sheetOpen && computed && (
        <div className="overlay" onClick={() => setSheetOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Live preview" onClick={(e) => e.stopPropagation()}>
            <LivePreview computed={computed} />
            <button className="btn-ghost small sheet-close" onClick={() => setSheetOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <Frame>{children}</Frame>
    </UIProvider>
  );
}
