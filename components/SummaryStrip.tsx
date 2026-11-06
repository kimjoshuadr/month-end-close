"use client";

import { useEffect, useRef, useState } from "react";
import type { Computed } from "../lib/types";
import { deltaWords, fmtDelta, fmtMoney } from "./format";

const ROLL_MS = 400;

function useCountUp(value: number, ms = ROLL_MS): number {
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
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (value - from) * eased);
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
  const [chip, setChip] = useState<{ d: number; k: number } | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current === value) return;
    const d = Math.round((value - prev.current) * 100) / 100;
    prev.current = value;
    if (Math.abs(d) < 0.005) {
      setChip(null);
      return;
    }
    const k = Date.now() + Math.random();
    setChip({ d, k });
    const t = window.setTimeout(() => setChip((c) => (c?.k === k ? null : c)), 2000);
    return () => window.clearTimeout(t);
  }, [value]);
  const text = display < 0 ? `($${fmtMoney(-display)})` : `$${fmtMoney(display)}`;
  return (
    <div className="kpi">
      <div className="k">{label}</div>
      <div className="v flash" key={Math.round(value * 100)}>
        {text}
        {chip && (
          <span className={`dchip ${chip.d < 0 ? "neg" : "pos"}`} aria-hidden="true">
            {fmtDelta(chip.d)}
          </span>
        )}
      </div>
    </div>
  );
}

// Polite announcer kept outside the strip so helpers and tests read stable KPIs.
function NiAnnouncer({ value }: { value: number }) {
  const [msg, setMsg] = useState("");
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (prev.current === null) {
      prev.current = value;
      return;
    }
    if (prev.current !== value) {
      const d = Math.round((value - (prev.current as number)) * 100) / 100;
      prev.current = value;
      if (Math.abs(d) >= 0.005) setMsg(`Adjusted net income now ${fmtMoney(value)}, ${deltaWords(d)}`);
    }
  }, [value]);
  return (
    <div className="sr" role="status" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
}

// Compact KPI portlet on every page; rolls values, chips deltas, announces NI.
export function SummaryStrip({ computed }: { computed: Computed | null }) {
  if (!computed) {
    return (
      <div className="strip" role="region" aria-label="Close summary" tabIndex={0}>
        <div className="kpi"><div className="k">Status</div><div className="v" style={{ fontSize: 13 }}>No packet loaded</div></div>
      </div>
    );
  }
  const booked = computed.proposal.ajes.filter((a) => a.status === "booked").length;
  let dr = 0;
  let cr = 0;
  for (const a of computed.proposal.ajes) {
    if (a.status !== "booked") continue;
    for (const l of a.lines) {
      dr += l.debit;
      cr += l.credit;
    }
  }
  const diff = Math.round((dr - cr) * 100) / 100;
  const off = !computed.balanced;
  return (
    <>
      <NiAnnouncer value={computed.netIncomeAdj} />
      <div className="strip" role="region" aria-label="Close summary" tabIndex={0}>
        <Cell label="Unadjusted NI" value={computed.netIncomeUnadj} />
        <Cell label="Adjustments" value={Math.round((computed.netIncomeAdj - computed.netIncomeUnadj) * 100) / 100} />
        <Cell label="Adjusted NI" value={computed.netIncomeAdj} />
        <div className="kpi">
          <div className="k">Dr = Cr</div>
          <div
            className={`v${off ? " drchip bad shake" : ""}`}
            style={{ color: off ? "var(--red)" : "var(--green)", fontSize: 13 }}
            key={off ? `off${diff}` : "on"}
            title={off ? `Out of balance by ${fmtMoney(Math.abs(diff))}` : "Debits equal credits"}
          >
            {off ? (Math.abs(diff) >= 0.005 ? fmtDelta(diff) : "Off") : "0.00"}
          </div>
        </div>
        <div className="kpi"><div className="k">Unresolved</div><div className="v" key={computed.unresolved}>{computed.unresolved}</div></div>
        <div className="kpi"><div className="k">Booked</div><div className="v" key={booked}>{booked}</div></div>
      </div>
    </>
  );
}
