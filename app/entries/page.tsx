"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useStore } from "../../state/store";
import { BridgeTable, JournalGrid } from "../../components/JournalGrid";
import { PageHeader, SummaryStrip } from "../../components/Shell";

function Body() {
  const { computed, final } = useStore();
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
  return (
    <div>
      <PageHeader crumb="Journal Entries" title="Journal Entries — September 2026" final={final} unresolved={computed.unresolved} />
      <SummaryStrip computed={computed} />
      <JournalGrid computed={computed} initialSel={sel} />
      <BridgeTable computed={computed} />
      <div className="panel">
        <div className="panel-h">Checked, no entry needed</div>
        <div className="gridwrap">
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
