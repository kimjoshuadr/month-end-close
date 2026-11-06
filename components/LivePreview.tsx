"use client";

import type { Computed } from "../lib/types";
import { fmtMoney } from "./format";
import { IconCaretDown, IconCaretUp, IconScale } from "./icons";
import { useAnimatedNumber } from "./studio";

function val(rows: { label: string; values: number[] }[], label: string, col = 0): number {
  return rows.find((r) => r.label === label)?.values[col] ?? NaN;
}

function Fig({ label, value, money = true }: { label: string; value: number; money?: boolean }) {
  const { display, dir } = useAnimatedNumber(value);
  const text = money ? fmtMoney(display) : display.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <div className={`pv-fig${dir !== 0 ? " flash" : ""}`}>
      <span className="pv-label">{label}</span>
      <span className="pv-value">
        {money ? "$" : ""}
        {text}
        {dir === 1 && <IconCaretUp size={12} className="delta up" />}
        {dir === -1 && <IconCaretDown size={12} className="delta down" />}
      </span>
    </div>
  );
}

// Persistent navy panel: the consequence of every answer and edit, always visible.
export function LivePreview({ computed }: { computed: Computed | null }) {
  const ni = computed?.netIncomeAdj ?? NaN;
  const { display } = useAnimatedNumber(Number.isFinite(ni) ? ni : 0);
  if (!computed) {
    return (
      <aside className="preview" aria-label="Live preview">
        <p className="eyebrow light">Live preview</p>
        <p className="pv-empty">Load the packet and this panel tracks every figure as you decide.</p>
      </aside>
    );
  }
  return (
    <aside className="preview" aria-label="Live preview">
      <p className="eyebrow light">Live preview</p>
      <div className="pv-hero">
        <span className="pv-label">Adjusted net income · September</span>
        <span className="pv-hero-value" aria-live="polite">${fmtMoney(display)}</span>
      </div>
      <Fig label="Revenue" value={val(computed.statements.isMonth.rows, "Total Sales")} />
      <Fig label="Total assets" value={val(computed.statements.bs.rows, "TOTAL ASSETS")} />
      <Fig label="Total liabilities" value={val(computed.statements.bs.rows, "TOTAL LIABILITIES")} />
      <Fig label="Total equity" value={val(computed.statements.bs.rows, "TOTAL EQUITY")} />
      <div className="pv-checks">
        <span className={`badge ${computed.balanced ? "ok" : "bad"} on-navy`}>
          <IconScale size={12} /> {computed.balanced ? "Dr = Cr · balanced" : "Out of balance"}
        </span>
        <span className="pv-unresolved">{computed.unresolved} open</span>
      </div>
    </aside>
  );
}

// Compact sticky bar for narrow screens; expands into a sheet with the full panel.
export function PreviewBar({ computed, onExpand }: { computed: Computed | null; onExpand: () => void }) {
  if (!computed) return null;
  return (
    <button className="previewbar" onClick={onExpand} aria-label="Open live preview">
      <span className="pvb-label">Adj. net income</span>
      <span className="pvb-value">${fmtMoney(computed.netIncomeAdj)}</span>
      <span className={`badge ${computed.balanced ? "ok" : "bad"}`}>{computed.balanced ? "Balanced" : "Off"}</span>
      <span className="pvb-open">{computed.unresolved} open</span>
    </button>
  );
}
