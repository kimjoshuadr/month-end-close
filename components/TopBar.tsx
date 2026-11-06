"use client";

import { useStore } from "../state/store";
import { fmtMoney } from "./format";

export function TopBar() {
  const { computed, final } = useStore();
  const ni = computed?.netIncomeAdj;
  return (
    <>
      <div>
        <span className="client">Greenline Landscape Co., LLC</span> <span className="period">September 2026</span>
      </div>
      <div className="spacer" />
      {computed ? (
        <>
          <div className="kpi">
            <span className="k">Adj. net income</span>
            <span className="v">${fmtMoney(ni ?? 0)}</span>
          </div>
          <div className="kpi">
            <span className="k">Dr = Cr</span>
            <span className="badge" style={{ background: "transparent", padding: 0 }}>
              <span className={`badge ${computed.balanced ? "ok" : "bad"}`}>{computed.balanced ? "Balanced" : "Out of balance"}</span>
            </span>
          </div>
          <div className="kpi">
            <span className="k">Open items</span>
            <span className="v">{computed.unresolved}</span>
          </div>
          <span className={`badge ${final ? "final" : "draft"}`}>{final ? "Final" : "Draft"}</span>
        </>
      ) : (
        <span className="muted small">No packet loaded</span>
      )}
    </>
  );
}
