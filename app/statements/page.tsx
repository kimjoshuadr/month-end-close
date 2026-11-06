"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { compute } from "../../lib/engine";
import { fluxReview } from "../../lib/engine/flux";
import { septFigures } from "../../lib/engine/statements";
import { buildCloseWorkbook } from "../../lib/export/statementsXlsx";
import { signoffBlockers } from "../../lib/signoff";
import { firstRowForAccount } from "../../lib/trace";
import { useStore } from "../../state/store";
import { FluxReview, unexplainedCount } from "../../components/FluxReview";
import { SignoffDialog } from "../../components/SignoffDialog";
import { ReportTable } from "../../components/ReportTable";import { PageHeader, SummaryStrip } from "../../components/Shell";
import { fmtMoney } from "../../components/format";
import { useDrill } from "../../components/erp-ui";
import { useToasts } from "../../components/Toasts";

const TABS = [
  { id: "cover", label: "Cover" },
  { id: "isMonth", label: "Income Statement — month" },
  { id: "isYtd", label: "Income Statement — YTD" },
  { id: "bs", label: "Balance Sheet" },
  { id: "cf", label: "Cash Flows" },
  { id: "ttm", label: "Trailing Twelve Months" },
  { id: "flux", label: "Flux Review" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type ReportId = Exclude<TabId, "cover" | "flux">;

const PERIODS: Record<ReportId, { title: string; period: string }> = {
  isMonth: { title: "Income Statement", period: "For the Month Ended September 30, 2026" },
  isYtd: { title: "Income Statement", period: "For the Nine Months Ended September 30, 2026" },
  bs: { title: "Balance Sheet", period: "As of September 30, 2026" },
  cf: { title: "Statement of Cash Flows", period: "For the Month and Nine Months Ended September 30, 2026" },
  ttm: { title: "Trailing Twelve Month Income Statement", period: "October 2025 through September 2026" },
};

function NotesBox({ tab, label }: { tab: string; label: string }) {
  const { notes, setNote } = useStore();
  const { push } = useToasts();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? notes[tab] ?? "";
  return (
    <div style={{ marginTop: 16 }}>
      <label className="f" htmlFor={`notes-${tab}`}>Reviewer notes — {label}</label>
      <textarea
        id={`notes-${tab}`}
        rows={2}
        placeholder="Notes for the reviewer file…"
        value={shown}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== null && text !== (notes[tab] ?? "")) {
            setNote(tab, text, label);
            push("Reviewer note saved", { undo: true });
          }
          setText(null);
        }}
      />
    </div>
  );
}

function Body() {
  const { computed, packet, answers, overrides, fluxNotes, signoff, final, reopen } = useStore();
  const { push } = useToasts();
  const { open } = useDrill();
  const acct = useSearchParams().get("acct");
  const [tab, setTab] = useState<TabId>("cover");
  const [signing, setSigning] = useState(false);

  const flux = useMemo(() => (computed ? fluxReview(septFigures(computed.adjTb)) : []), [computed]);
  const unexplained = useMemo(() => unexplainedCount(flux, fluxNotes), [flux, fluxNotes]);

  const exportExcel = () => {
    if (!computed) return;
    const wb = buildCloseWorkbook(computed, flux, fluxNotes, signoff);
    XLSX.writeFile(wb, "month-end-close-2026-09.xlsx");
    push("Excel workbook downloaded", {});
  };

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
        <PageHeader crumb="Financial Statements" title="Financial Statements" final={final} unresolved={0} empty />
        <SummaryStrip computed={null} />
        <div className="panel"><div className="panel-b muted">Load the packet to generate the September reports.</div></div>
      </div>
    );
  }

  const tabLabel = TABS.find((t) => t.id === tab)?.label ?? tab;
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
            <button className="btn small" onClick={exportExcel}>Export to Excel</button>
            {final ? (
              <button className="btn small" onClick={() => { reopen(); push("Reopened as draft; sign-off cleared", { undo: true }); }}>Reopen</button>
            ) : (
              <button className="btn small" onClick={() => setSigning(true)}>Mark as final</button>
            )}
          </>
        }
      />
      {signing && !final && (
        <SignoffDialog unresolved={computed.unresolved} unexplained={unexplained} onClose={() => setSigning(false)} />
      )}
      <p className="small muted" style={{ margin: "0 0 12px" }}>Statements are derived from the entries so they always tie; edit amounts in <Link href="/entries">Journal Entries</Link>.</p>
      <SummaryStrip computed={computed} />
      {!final && (computed.unresolved > 0 || unexplained > 0) && (
        <div className="alert warn">
          DRAFT — {computed.unresolved > 0 && <>{computed.unresolved} unresolved items. </>}
          {unexplained > 0 && <>{unexplained} unexplained flux lines. </>}
          Alternative answers swing net income by up to ${fmtMoney(swing)}. <Link href="/open-items">Resolve in the worklist</Link>.
        </div>
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
              {t.id === "flux" && unexplained > 0 ? `Flux Review (${unexplained})` : t.label}
            </button>
          ))}
        </div>
        <div className="paper" style={{ border: "none", borderRadius: 0 }}>
          {!final && computed.unresolved > 0 && <div className="ribbon">Draft</div>}
          {tab === "cover" ? (
            <div className="paper-head" style={{ padding: "64px 0" }}>
              <p className="eyebrow" style={{ color: "var(--muted)" }}>Greenline Landscape Co., LLC</p>
              <h2>Financial Statements</h2>
              <p className="muted">September 30, 2026</p>
              {signoff && (
                <p className="small" style={{ marginTop: 12 }}>
                  Prepared by {signoff.preparedBy} · Reviewed by {signoff.reviewedBy}<br />
                  <span className="muted">Signed {new Date(signoff.at).toLocaleString()}. Names are typed, not authenticated (no login in this demo).</span>
                </p>
              )}
              <p className="footnote small muted" style={{ fontStyle: "italic", marginTop: 32 }}>
                Fictional example created for a hiring exercise.
              </p>
            </div>
          ) : tab === "flux" ? (
            <>
              <div className="paper-head">
                <p className="eyebrow" style={{ color: "var(--muted)" }}>Greenline Landscape Co., LLC</p>
                <h2>Flux Review</h2>
                <p className="muted small">September 2026 adjusted vs August 2026 and September 2025 · flagged when |change| ≥ $1,000 and |%| ≥ 10%</p>
              </div>
              <FluxReview lines={flux} />
              <p className="footnote small muted" style={{ fontStyle: "italic", marginTop: 12 }}>
                Fictional example created for a hiring exercise. Explanations are saved to the session and the audit trail.
              </p>
            </>
          ) : (
            <>
              <div className="paper-head">
                <p className="eyebrow" style={{ color: "var(--muted)" }}>Greenline Landscape Co., LLC</p>
                <h2>{PERIODS[tab as ReportId].title}</h2>
                <p className="muted small">{PERIODS[tab as ReportId].period}</p>
              </div>
              <ReportTable tableId={tab as ReportId} table={computed.statements[tab as ReportId]} />
              <p className="footnote small muted" style={{ fontStyle: "italic", marginTop: 12 }}>
                Fictional example created for a hiring exercise. Amounts rounded to whole dollars.
                {tab === "cf" && " Owner Contributions / Owner Loan Proceeds lines extend the August format."}
              </p>
            </>
          )}
          <NotesBox tab={tab} label={tabLabel} />
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
