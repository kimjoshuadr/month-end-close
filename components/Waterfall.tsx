"use client";

import type { Computed } from "../lib/types";
import { fmtMoney } from "./format";
import { useUI } from "./studio";

const REV_EXP = new Set([4000, 4100, 5000, 5100, 6000, 6010, 6100, 6110, 6120, 6130, 6140, 6150, 6160, 6170, 6180, 6190]);

function niEffect(lines: { acct: number; debit: number; credit: number }[]): number {
  return lines.filter((l) => REV_EXP.has(l.acct)).reduce((s, l) => s + l.credit - l.debit, 0);
}

// Horizontal SVG waterfall: unadjusted NI, one bar per booked entry, adjusted NI.
export function Waterfall({ computed }: { computed: Computed }) {
  const { openTrace } = useUI();
  const segs = computed.proposal.ajes
    .filter((a) => a.status === "booked")
    .map((a) => ({ id: a.id, title: a.title, effect: Math.round((niEffect(a.lines) + Number.EPSILON) * 100) / 100 }))
    .filter((s) => s.effect !== 0);
  const start = computed.netIncomeUnadj;
  const W = 720;
  const rowH = 44;
  const H = (segs.length + 2) * rowH + 30;
  const min = Math.min(start, computed.netIncomeAdj);
  const max = Math.max(start, computed.netIncomeAdj);
  const span = Math.max(1, max - min);
  const x = (v: number) => 200 + ((v - min) / span) * (W - 260);
  let cursor = start;
  const bars: { x: number; w: number; y: number; label: string; value: string; id?: string; cls: string }[] = [];
  segs.forEach((s, i) => {
    const from = cursor;
    cursor = Math.round((cursor + s.effect) * 100) / 100;
    bars.push({
      x: Math.min(x(from), x(cursor)), w: Math.max(3, Math.abs(x(cursor) - x(from))),
      y: (i + 1) * rowH + 8, label: s.title, value: fmtMoney(s.effect), id: s.id, cls: "wf-bar-neg",
    });
  });
  return (
    <svg className="waterfall" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Net income waterfall from ${fmtMoney(start)} to ${fmtMoney(computed.netIncomeAdj)}`}>
      <text className="wf-label" x={8} y={rowH - 12}>Unadjusted</text>
      <rect className="wf-bar-start" x={8} y={rowH - 8} width={Math.max(3, x(start) - 8)} height={20} rx={4} />
      <text className="wf-value" x={12} y={rowH + 30}>${fmtMoney(start)}</text>
      {bars.map((b, i) => (
        <g key={i} onClick={() => b.id && openTrace({ kind: "entry", ajeId: b.id })} onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && b.id) openTrace({ kind: "entry", ajeId: b.id }); }} tabIndex={0} role="button" aria-label={`Trace ${b.label}`}>
          <line className="wf-link" x1={i === 0 ? x(start) : bars[i - 1].x + bars[i - 1].w} y1={b.y - 14} x2={b.x + b.w / 2} y2={b.y} />
          <rect className={b.cls} x={b.x} y={b.y} width={b.w} height={20} rx={4} />
          <text className="wf-label" x={8} y={b.y + 15}>{b.label.length > 26 ? b.label.slice(0, 25) + "…" : b.label}</text>
          <text className="wf-value" x={b.x + b.w + 6} y={b.y + 15}>{b.value}</text>
        </g>
      ))}
      <text className="wf-label" x={8} y={(segs.length + 1) * rowH + 22}>Adjusted</text>
      <rect className="wf-bar-end" x={8} y={(segs.length + 1) * rowH + 26} width={Math.max(3, x(cursor) - 8)} height={20} rx={4} />
      <text className="wf-value" x={12} y={(segs.length + 1) * rowH + 62}>${fmtMoney(computed.netIncomeAdj)}</text>
    </svg>
  );
}
