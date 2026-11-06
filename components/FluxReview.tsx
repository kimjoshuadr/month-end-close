"use client";

import { useState } from "react";
import type { FluxLine } from "../lib/engine/flux";
import { fmtMoney, fmtWhole } from "./format";
import { useToasts } from "./Toasts";
import { useStore } from "../state/store";

export function unexplainedCount(lines: FluxLine[], notes: Record<string, string>): number {
  return lines.filter((l) => l.flagged && !(notes[l.line] ?? "").trim()).length;
}

function pctText(p: number | null): string {
  if (p === null) return "—";
  return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
}

// Flux grid: September 2026 adjusted vs August 2026 and September 2025,
// with a per-flagged-line explanation captured to session state + audit.
export function FluxReview({ lines }: { lines: FluxLine[] }) {
  const { fluxNotes, setFluxNote } = useStore();
  const { push } = useToasts();
  const [drafts, setDrafts] = useState<Record<string, string | null>>({});
  return (
    <div className="gridwrap" role="region" aria-label="Flux review" tabIndex={0}>
      <table className="grid">
        <thead>
          <tr>
            <th scope="col">Line</th>
            <th scope="col" className="num">Sep 2026</th>
            <th scope="col" className="num">Aug 2026</th>
            <th scope="col" className="num">Sep 2025</th>
            <th scope="col" className="num">$ vs Aug</th>
            <th scope="col" className="num">% vs Aug</th>
            <th scope="col" className="num">$ vs Sep 25</th>
            <th scope="col" className="num">% vs Sep 25</th>
            <th scope="col">Explanation</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => {
            const saved = fluxNotes[l.line] ?? "";
            const shown = drafts[l.line] ?? saved;
            return (
              <tr key={l.line} className={l.flagged ? "selected" : undefined}>
                <td><strong style={{ color: "var(--navy)" }}>{l.line}</strong>{l.flagged && <div className="small"><span className="st unresolved">Review</span></div>}</td>
                <td className="num">{fmtWhole(l.current)}</td>
                <td className="num">{fmtWhole(l.aug)}</td>
                <td className="num">{fmtWhole(l.sep25)}</td>
                <td className="num">{fmtMoney(l.dAug)}</td>
                <td className="num">{pctText(l.pctAug)}</td>
                <td className="num">{fmtMoney(l.dSep25)}</td>
                <td className="num">{pctText(l.pctSep25)}</td>
                <td style={{ minWidth: 200 }}>
                  {l.flagged ? (
                    <textarea
                      rows={2}
                      aria-label={`Flux explanation for ${l.line}`}
                      placeholder="Why did this move?"
                      value={shown}
                      onChange={(e) => setDrafts((d) => ({ ...d, [l.line]: e.target.value }))}
                      onBlur={() => {
                        const v = drafts[l.line];
                        setDrafts((d) => ({ ...d, [l.line]: null }));
                        if (v !== null && v !== undefined && v !== saved) {
                          setFluxNote(l.line, v);
                          push("Flux explanation saved", { undo: true });
                        }
                      }}
                    />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
