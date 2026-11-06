"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { compute } from "../../lib/engine";
import { firstRowForAccount } from "../../lib/trace";
import { useStore } from "../../state/store";
import { ReportTable } from "../../components/ReportTable";
import { PageHeader, SummaryStrip } from "../../components/Shell";
import { fmtMoney } from "../../components/format";
import { useDrill } from "../../components/erp-ui";

const TABS = [
  { id: "isMonth", label: "Income Statement — month" },
  { id: "isYtd", label: "Income Statement — YTD" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cf", label: "Cash Flows" },
] as const;

const PERIODS: Record<(typeof TABS)[number]["id"], { title: string; period: string }> = {
  isMonth: { title: "Income Statement", period: "For the Month Ended September 30, 2026" },
  isYtd: { title: "Income Statement", period: "For the Nine Months Ended September 30, 2026" },
  bs: { title: "Balance Sheet", period: "As of September 30, 2026" },
  cf: { title: "Statement of Cash Flows", period: "For the Month and Nine Months Ended September 30, 2026" },
};

function Body() {
  const { computed, packet, answers, overrides, final, toggleFinal } = useStore();
  const { open } = useDrill();
  const acct = useSearchParams().get("acct");
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("isMonth");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (acct && computed) {
      const ref = firstRowForAccount(computed, Number(acct));
      if (ref) {
        setTab(ref.table);
        open({ kind: "statement", table: ref.table, label: ref.label });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acct]);

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

  if (!computed) {
    return (
      <div>
        <PageHeader crumb="Financial Statements" title="Financial Statements" final={final} unresolved={0} />
        <SummaryStrip computed={null} />
        <div className="panel"><div className="panel-b muted">Load the packet to generate the September reports.</div></div>
      </div>
    );
  }

  const meta = PERIODS[tab];
  return (
    <div>
      <PageHeader
        crumb="Financial Statements"
        title="Financial Statements — September 2026"
        final={final}
        unresolved={computed.unresolved}
        toolbar={
          <>
            <button className="btn small" onClick={() => window.print()}>Print / PDF</button>
            {final ? (
              <button className="btn small" onClick={toggleFinal}>Reopen</button>
            ) : confirming ? (
              <>
                <button className="btn primary small" onClick={() => { toggleFinal(); setConfirming(false); }}>Confirm final</button>
                <button className="btn small" onClick={() => setConfirming(false)}>Cancel</button>
              </>
            ) : (
              <button className="btn small" onClick={() => setConfirming(true)}>Mark as final</button>
            )}
          </>
        }
      />
      <SummaryStrip computed={computed} />
      {!final && computed.unresolved > 0 && (
        <div className="alert warn">DRAFT — {computed.unresolved} unresolved items. Alternative answers swing net income by up to ${fmtMoney(swing)}. <Link href="/open-items">Resolve in the worklist</Link>.</div>
      )}
      <div className="panel">
        <div className="panel-h" style={{ gap: 4 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`btn small${tab === t.id ? " primary" : ""}`}
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              style={tab === t.id ? undefined : { border: "none" }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="paper" style={{ border: "none", borderRadius: 0 }}>
          {!final && computed.unresolved > 0 && <div className="ribbon">Draft</div>}
          <div className="paper-head">
            <p className="eyebrow" style={{ color: "var(--muted)" }}>Greenline Landscape Co., LLC</p>
            <h2>{meta.title}</h2>
            <p className="muted small">{meta.period}</p>
          </div>
          <ReportTable tableId={tab} table={computed.statements[tab]} />
          <p className="footnote small muted" style={{ fontStyle: "italic", marginTop: 12 }}>
            Fictional example created for a hiring exercise. Amounts rounded to whole dollars.
            {tab === "cf" && " Owner Contributions / Owner Loan Proceeds lines extend the August format."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StatementsPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
