"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { compute } from "../../lib/engine";
import { useStore } from "../../state/store";
import { EmptyState } from "../../components/AjeTable";
import { StatementTable } from "../../components/StatementTable";
import { fmtMoney } from "../../components/format";

const TABS = [
  { id: "isMonth", label: "Income Statement (month)" },
  { id: "isYtd", label: "Income Statement (YTD)" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cf", label: "Cash Flows" },
] as const;

export default function StatementsPage() {
  const { computed, packet, answers, overrides, final, toggleFinal } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("isMonth");

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

  if (!computed) return <EmptyState title="No statements yet" body="Load the sample packet or upload the month-end files to generate the September statements." />;

  return (
    <div>
      <p className="eyebrow">Statements</p>
      <h1>September 2026 statements (draft)</h1>

      {!final && (
        <div className="banner">
          DRAFT — {computed.unresolved} unresolved item{computed.unresolved === 1 ? "" : "s"}. Alternative answers swing net income by up to ${fmtMoney(swing)}.{" "}
          <Link href="/open-items">Resolve open items</Link>
        </div>
      )}
      {final && (
        <div className="banner" style={{ background: "var(--green-bg)", borderColor: "#bfe0cd", color: "var(--green)" }}>
          Marked as final. This is a local display state only — nothing was sent anywhere.
        </div>
      )}
      {!computed.balanced && (
        <div className="alert error">Out of balance: an entry was edited so debits no longer equal credits. Fix the entry on the <Link href="/entries">Entries</Link> page.</div>
      )}

      <div className="tabs noprint" role="tablist" aria-label="Statements">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button className="btn ghost small" onClick={() => window.print()}>Print / PDF</button>
        <button className="btn secondary small" onClick={toggleFinal}>{final ? "Reopen as draft" : "Mark as final"}</button>
      </div>

      {tab === "isMonth" && (
        <StatementTable title="Income Statement" period="For the Month Ended September 30, 2026" table={computed.statements.isMonth} />
      )}
      {tab === "isYtd" && (
        <StatementTable title="Income Statement" period="For the Nine Months Ended September 30, 2026" table={computed.statements.isYtd} />
      )}
      {tab === "bs" && (
        <StatementTable title="Balance Sheet" period="As of September 30, 2026" table={computed.statements.bs} />
      )}
      {tab === "cf" && (
        <StatementTable
          title="Statement of Cash Flows"
          period="For the Month and Nine Months Ended September 30, 2026"
          table={computed.statements.cf}
          footnote="Fictional example created for a hiring exercise. Amounts rounded to whole dollars. Owner Contributions / Owner Loan Proceeds lines are a deliberate extension of the August format."
        />
      )}
      <p className="small muted noprint" style={{ marginTop: 10 }}>
        Derived live from the <Link href="/entries">adjusting entries</Link>; every change there or in <Link href="/open-items">open items</Link> refreshes these statements.
      </p>
    </div>
  );
}
