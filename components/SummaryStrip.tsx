"use client";

import { useEffect, useRef, useState } from "react";
import type { Computed } from "../lib/types";
import { fmtMoney } from "./format";

function useCountUp(value: number, ms = 350): number {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || prev.current === value) {
      prev.current = value;
      setDisplay(value);
      return;
    }
    const from = prev.current;
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setDisplay(from + (value - from) * k);
      if (k < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      prev.current = value;
    };
  }, [value, ms]);
  return display;
}

function Cell({ label, value }: { label: string; value: number }) {
  const display = useCountUp(value);
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <div className="v flash" key={Math.round(value * 100)}>${fmtMoney(display)}</div>
    </div>
  );
}

// Compact KPI portlet on every page; flashes cells whose values changed.
export function SummaryStrip({ computed }: { computed: Computed | null }) {
  if (!computed) {
    return (
      <div className="strip" aria-label="Close summary">
        <div className="kpi"><div className="k">Status</div><div className="v" style={{ fontSize: 13 }}>No packet loaded</div></div>
      </div>
    );
  }
  const booked = computed.proposal.ajes.filter((a) => a.status === "booked").length;
  return (
    <div className="strip" aria-label="Close summary" aria-live="polite">
      <Cell label="Unadjusted NI" value={computed.netIncomeUnadj} />
      <Cell label="Adjustments" value={Math.round((computed.netIncomeAdj - computed.netIncomeUnadj) * 100) / 100} />
      <Cell label="Adjusted NI" value={computed.netIncomeAdj} />
      <div className="kpi">
        <div className="k">Dr = Cr</div>
        <div className="v" style={{ color: computed.balanced ? "var(--green)" : "var(--red)", fontSize: 13 }} key={String(computed.balanced)}>
          {computed.balanced ? "0.00" : "Off"}
        </div>
      </div>
      <div className="kpi"><div className="k">Unresolved</div><div className="v" key={computed.unresolved}>{computed.unresolved}</div></div>
      <div className="kpi"><div className="k">Booked</div><div className="v" key={booked}>{booked}</div></div>
    </div>
  );
}
