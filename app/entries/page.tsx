"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { buildJeCsv } from "../../lib/export/journalCsv";
import { useStore } from "../../state/store";
import { BridgeTable, JournalGrid } from "../../components/JournalGrid";
import { PageHeader, SummaryStrip } from "../../components/Shell";
import { useToasts } from "../../components/Toasts";

function Body() {
  const { computed, final } = useStore();
  const { push } = useToasts();
  const sel = useSearchParams().get("sel");
  if (!computed) {
    return (
      <div>
        <PageHeader crumb="Journal Entries" title="Journal Entries" final={final} unresolved={0} empty />
        <SummaryStrip computed={null} />
        <div className="panel"><div className="panel-b muted">Load the packet to review the drafted entries.</div></div>
      </div>
    );
  }
  const exportCsv = () => {
    const names = new Map(computed.adjTb.map((r) => [r.no, r.name]));
    const blob = new Blob([buildJeCsv(computed, names)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "month-end-close-JE-2026-09.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    push("JE import CSV downloaded", {});
  };
  return (
    <div>
      <PageHeader
        crumb="Journal Entries"
        title="Journal Entries — September 2026"
        final={final}
        unresolved={computed.unresolved}
        toolbar={<button className="btn small" onClick={exportCsv}>Export JE import (CSV)</button>}
      />
      <SummaryStrip computed={computed} />
      <JournalGrid computed={computed} initialSel={sel} />
      <BridgeTable computed={computed} />
      <div className="panel">
        <div className="panel-h">Checked, no entry needed</div>
        <div className="gridwrap" role="region" aria-label="Checked items" tabIndex={0}>
          <table className="grid">
            <thead><tr><th scope="col">Item</th><th scope="col">Reason</th></tr></thead>
            <tbody>
              {computed.proposal.checked.map((c, i) => (
                <tr key={i}><td><strong style={{ color: "var(--navy)" }}>{c.title}</strong></td><td className="small">{c.reason}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function EntriesPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
