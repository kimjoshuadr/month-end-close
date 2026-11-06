"use client";

import type { Computed } from "../lib/types";
import { fmtMoney } from "./format";
import { useUI } from "./studio";

const REV_EXP = new Set([4000, 4100, 5000, 5100, 6000, 6010, 6100, 6110, 6120, 6130, 6140, 6150, 6160, 6170, 6180, 6190]);

function niEffect(lines: { acct: number; debit: number; credit: number }[]): number {
  return lines.filter((l) => REV_EXP.has(l.acct)).reduce((s, l) => s + l.credit - l.debit, 0);
}

// Horizontal SVG waterfall: gutter labels, floating bars on one scale, values right.
export function Waterfall({ computed }: { computed: Computed }) {
  const { openTrace } = useUI();
  const segs = computed.proposal.ajes
    .filter((a) => a.status === "booked")
    .map((a) => ({ id: a.id, title: a.title, effect: Math.round((niEffect(a.lines) + Number.EPSILON) * 100) / 100 }))
    .filter((s) => s.effect !== 0);
  const start = computed.netIncomeUnadj;
  const W = 720;
  const GUT = 208;
  const VAL = 96;
  const rowH = 46;
  const H = (segs.length + 2) * rowH + 24;
  const min = Math.min(start, computed.netIncomeAdj);
  const max = Math.max(start, computed.netIncomeAdj);
  const span = Math.max(1, max - min);
  const lo = min - span * 0.12;
  const x = (v: number) => GUT + ((v - lo) / (span * 1.12)) * (W - GUT - VAL);
  const valX = W - 8;
  let cursor = start;
  const shave = (t: string, n = 27) => (t.length > n ? t.slice(0, n - 1) + "…" : t);
  return (
    <svg className="waterfall" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Net income waterfall from ${fmtMoney(start)} to ${fmtMoney(computed.netIncomeAdj)}`}>
      <text className="wf-label" x={8} y={20}>Unadjusted</text>
      <rect className="wf-bar-start" x={x(lo)} y={26} width={Math.max(4, x(start) - x(lo))} height={18} rx={4} />
      <text className="wf-value wf-num" x={valX} y={40}>${fmtMoney(start)}</text>
      {segs.map((s, i) => {
        const from = cursor;
        cursor = Math.round((cursor + s.effect) * 100) / 100;
        const y = (i + 1) * rowH + 26;
        const bx = Math.min(x(from), x(cursor));
        const bw = Math.max(4, Math.abs(x(cursor) - x(from)));
        return (
          <g key={s.id} onClick={() => openTrace({ kind: "entry", ajeId: s.id })} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") openTrace({ kind: "entry", ajeId: s.id }); }} tabIndex={0} role="button" aria-label={`Trace ${s.title}`}>
            <line className="wf-link" x1={x(from)} y1={y - rowH + 22} x2={x(from)} y2={y - 3} />
            <text className="wf-label" x={8} y={y - 4}>{shave(s.title)}</text>
            <rect className="wf-bar-neg" x={bx} y={y} width={bw} height={18} rx={4} />
            <text className="wf-value wf-num" x={valX} y={y + 14}>{fmtMoney(s.effect)}</text>
          </g>
        );
      })}
      <text className="wf-label" x={8} y={(segs.length + 1) * rowH + 20}>Adjusted</text>
      <rect className="wf-bar-end" x={x(lo)} y={(segs.length + 1) * rowH + 26} width={Math.max(4, x(cursor) - x(lo))} height={18} rx={4} />
      <text className="wf-value wf-num" x={valX} y={(segs.length + 1) * rowH + 40}>${fmtMoney(computed.netIncomeAdj)}</text>
    </svg>
  );
}
