"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { traceFor, type TraceKey } from "../lib/trace";
import { useStore } from "../state/store";
import { IconClock, IconX } from "./icons";
import { useUI } from "./studio";

// Right slide-over; closes on Esc, focuses its close button on open.
export function Drawer({ label, title, eyebrow, onClose, children, wide }: { label: string; title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fn);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className={`drawer${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <strong className="drawer-title">{title}</strong>
          </div>
          <button ref={closeRef} className="iconbtn" onClick={onClose} aria-label={`Close ${label}`}>
            <IconX />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

const TONE: Record<string, string> = { booked: "booked", assumed: "assumed", notbooked: "notbooked", info: "info" };

// Every clickable figure lands here: entries, sources, rule, flag.
export function TraceDrawer({ traceKey, onClose }: { traceKey: TraceKey; onClose: () => void }) {
  const { packet, computed } = useStore();
  const t = packet && computed ? traceFor(packet, computed, traceKey) : null;
  return (
    <Drawer label="Number trace" title={t?.title ?? "Trace"} eyebrow="Trace this number" onClose={onClose}>
      {!t && <p className="muted">Nothing to trace here.</p>}
      {t && (
        <>
          <div className="badgerow">
            {t.badges.map((b, i) => (
              <span key={i} className={`badge ${TONE[b.tone] ?? "info"}`}>{b.text}</span>
            ))}
          </div>
          <p className="trace-rule">{t.rule}</p>
          <p className="eyebrow">Lines</p>
          <ul className="trace-lines">
            {t.lines.map((l, i) => (
              <li key={i}>
                <span>{l.label}</span>
                <span className="num">{l.value}</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow">Source excerpts</p>
          <ul className="trace-sources">
            {t.sources.map((s, i) => (
              <li key={i}>
                <strong>{s.label}</strong>
                <span>{s.excerpt}</span>
              </li>
            ))}
          </ul>
          {t.flag && (
            <div className="trace-flag">
              <p className="eyebrow">Open item</p>
              <strong>{t.flag.title}</strong>
              <p className="small muted">{t.flag.evidence}</p>
              <Link href="/decisions" onClick={onClose} className="btn-ghost small">Decide now</Link>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

// Audit log as a slide-over timeline.
export function AuditDrawer() {
  const { audit } = useStore();
  const { setAuditOpen } = useUI();
  return (
    <Drawer label="Audit log" title="Audit log" eyebrow="Session trail" onClose={() => setAuditOpen(false)}>
      {audit.length === 0 && <p className="muted">Nothing logged yet. Load a packet to start the trail.</p>}
      <ol className="timeline">
        {[...audit].reverse().map((e, i) => (
          <li key={i}>
            <span className="t-dot" aria-hidden="true" />
            <div>
              <p className="t-msg">{e.msg}</p>
              <p className="t-time"><IconClock size={12} /> {new Date(e.ts).toLocaleString()}</p>
            </div>
          </li>
        ))}
      </ol>
    </Drawer>
  );
}
