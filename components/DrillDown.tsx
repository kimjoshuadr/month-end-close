"use client";

import Link from "next/link";
import { traceFor, type TraceKey } from "../lib/trace";
import { useStore } from "../state/store";
import { useDrill } from "./erp-ui";
import { ajeNo, fmtReverseDate } from "./format";
import { Dialog } from "./Dialog";

// Drill-down side panel: entries and sources behind any figure.
export function DrillDown() {
  const { key, close } = useDrill();
  const { packet, computed } = useStore();
  if (!key) return null;
  const t = packet && computed ? traceFor(packet, computed, key as TraceKey) : null;
  const entryId = key.kind === "entry" || key.kind === "aje-line" ? key.ajeId : undefined;
  const entry = entryId ? computed?.proposal.ajes.find((a) => a.id === entryId) : undefined;
  const title = t && entryId ? `${ajeNo(entryId)} · ${t.title}` : (t?.title ?? "Detail");
  const flagId = key.kind === "entry" || key.kind === "aje-line"
    ? computed?.proposal.ajes.find((a) => a.id === key.ajeId)?.flagId
    : t?.flag
      ? computed?.proposal.flags.find((f) => f.title === t.flag!.title)?.id
      : undefined;
  return (
    <Dialog label="Drill-down" title={title} eyebrow="Drill-down" onClose={close} closeLabel="Close drill-down">
      {!t && <p className="muted">Nothing behind this figure.</p>}
      {t && (
        <>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {t.badges.map((b, i) => (
              <span key={i} className={`st ${b.tone === "notbooked" ? "notbooked" : b.tone}`}>{b.text}</span>
            ))}
            {entry?.reverseOn && <span className="st info">Auto-reverse {fmtReverseDate(entry.reverseOn)}</span>}
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
    </Dialog>
  );
}
