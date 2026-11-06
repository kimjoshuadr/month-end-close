"use client";

import Link from "next/link";
import { traceFor, type TraceKey } from "../lib/trace";
import { useStore } from "../state/store";
import { useDrill } from "./erp-ui";
import { ajeNo } from "./format";
import { IconX } from "./icons";

// Drill-down side panel: entries and sources behind any figure.
export function DrillDown() {
  const { key, close } = useDrill();
  const { packet, computed } = useStore();
  if (!key) return null;
  const t = packet && computed ? traceFor(packet, computed, key as TraceKey) : null;
  const entryId = key.kind === "entry" || key.kind === "aje-line" ? key.ajeId : undefined;
  const title = t && entryId ? `${ajeNo(entryId)} · ${t.title}` : (t?.title ?? "Detail");
  const flagId = key.kind === "entry" || key.kind === "aje-line"
    ? computed?.proposal.ajes.find((a) => a.id === key.ajeId)?.flagId
    : t?.flag
      ? computed?.proposal.flags.find((f) => f.title === t.flag!.title)?.id
      : undefined;
  return (
    <div className="overlay" onClick={close}>
      <div className="drawer" role="dialog" aria-modal="true" aria-label="Drill-down" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Drill-down</p>
            <strong className="drawer-title">{title}</strong>
          </div>
          <button className="iconbtn" onClick={close} aria-label="Close drill-down" autoFocus><IconX /></button>
        </header>
        <div className="drawer-body">
          {!t && <p className="muted">Nothing behind this figure.</p>}
          {t && (
            <>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {t.badges.map((b, i) => (
                  <span key={i} className={`st ${b.tone === "notbooked" ? "notbooked" : b.tone}`}>{b.text}</span>
                ))}
              </div>
              <p>{t.rule}</p>
              <p className="eyebrow">Lines</p>
              <ul className="trace-lines">
                {t.lines.map((l, i) => (
                  <li key={i}><span>{l.label}</span><span className="num">{l.value}</span></li>
                ))}
              </ul>
              <p className="eyebrow">Source documents</p>
              <ul className="trace-sources">
                {t.sources.map((s, i) => (
                  <li key={i}><strong>{s.label}</strong><span>{s.excerpt}</span></li>
                ))}
              </ul>
              {flagId && (
                <Link className="btn small" href={`/open-items?sel=${flagId}`} onClick={close}>Open in worklist</Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
