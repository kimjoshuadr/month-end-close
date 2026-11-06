"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { compute } from "../../lib/engine";
import { useStore } from "../../state/store";
import { EmptyStep } from "../../components/AjeTable";
import { StatementTable } from "../../components/StatementTable";
import { fmtMoney } from "../../components/format";
import { IconCheck, IconPrint } from "../../components/icons";

const TABS = [
  { id: "isMonth", label: "Income · month" },
  { id: "isYtd", label: "Income · YTD" },
  { id: "bs", label: "Balance sheet" },
  { id: "cf", label: "Cash flows" },
] as const;

const PERIODS: Record<(typeof TABS)[number]["id"], { title: string; period: string }> = {
  isMonth: { title: "Income Statement", period: "For the Month Ended September 30, 2026" },
  isYtd: { title: "Income Statement", period: "For the Nine Months Ended September 30, 2026" },
  bs: { title: "Balance Sheet", period: "As of September 30, 2026" },
  cf: { title: "Statement of Cash Flows", period: "For the Month and Nine Months Ended September 30, 2026" },
};

export default function StatementsPage() {
  const { computed, packet, answers, overrides, final, toggleFinal } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("isMonth");
  const [confirming, setConfirming] = useState(false);

  const swing = useMemo(() => {
    if (!packet || !computed) return 0;
    let s = 0;
    for (const f of computed.proposal.flags) {
      for (const o of f.options) {
        const a = f.kind === "info" ? { ack: true } : { option: o.id };
        const ni = compute(packet, { ...answers, [f.id]: a }, overrides).netIncomeAdj;
        s = Math.max(s, Math.abs(ni - computed.netIncomeAdj));
      }
    }
    return s;
  }, [packet, computed, answers, overrides]);

  if (!computed) return <EmptyStep title="Statements are locked" body="Load the packet and make the calls — the paper writes itself from your entries." />;

  const meta = PERIODS[tab];
  return (
    <div>
      <div className="stephead">
        <p className="eyebrow">Step 4 of 4 · Statements</p>
        <h2>September, on paper</h2>
        <p>Draft {final ? "marked final" : `with ${computed.unresolved} open item${computed.unresolved === 1 ? "" : "s"} · alternatives swing NI by $${fmtMoney(swing)}`}. Click any figure to trace it.</p>
      </div>

      <div className="noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
        <div className="seg" role="tablist" aria-label="Statements">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn-ghost small" onClick={() => window.print()}><IconPrint size={14} /> Print / PDF</button>
        {final ? (
          <span className="badge ok"><IconCheck size={12} /> Final</span>
        ) : confirming ? (
          <>
            <button className="btn-primary small" onClick={() => { toggleFinal(); setConfirming(false); }}>Confirm final</button>
            <button className="btn-ghost small" onClick={() => setConfirming(false)}>Keep drafting</button>
          </>
        ) : (
          <button className="btn-ghost small" onClick={() => setConfirming(true)}>Mark as final</button>
        )}
      </div>

      <div className="paper">
        {!final && computed.unresolved > 0 && <div className="ribbon">Draft</div>}
        <div className="paper-head">
          <p className="eyebrow">Greenline Landscape Co., LLC</p>
          <h2>{meta.title}</h2>
          <p className="muted small">{meta.period}</p>
        </div>
        <hr className="paper-rule" />
        <StatementTable tableId={tab} table={computed.statements[tab]} />
        <p className="footnote small">
          Fictional example created for a hiring exercise. Amounts rounded to whole dollars.
          {tab === "cf" && " Owner Contributions / Owner Loan Proceeds lines extend the August format."}
        </p>
      </div>
      <p className="small muted noprint" style={{ marginTop: 10 }}>
        Live from your <Link href="/entries">entries</Link> and <Link href="/decisions">decisions</Link> — change anything and this paper rewrites itself.
      </p>
    </div>
  );
}
