"use client";

import Link from "next/link";
import { useStore } from "../../state/store";
import { EmptyStep, LedgerCards } from "../../components/AjeTable";
import { IconArrowR } from "../../components/icons";
import { Waterfall } from "../../components/Waterfall";

export default function EntriesPage() {
  const { computed } = useStore();
  if (!computed) return <EmptyStep title="Entries are locked" body="Load the packet first — the studio drafts every entry from its documents." />;
  return (
    <div>
      <div className="stephead">
        <p className="eyebrow">Step 2 of 4 · Entries</p>
        <h2>Five entries, all sourced</h2>
        <p>Every line cites its document — click a source chip or a total to trace it. Amounts edit inline; everything recomputes.</p>
      </div>
      <div className="panel">
        <p className="eyebrow">Net income bridge · September</p>
        <Waterfall computed={computed} />
      </div>
      <LedgerCards computed={computed} />
      <div className="panel">
        <p className="eyebrow">Checked, no entry needed</p>
        {computed.proposal.checked.map((c, i) => (
          <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--hairline-soft)" }}>
            <strong style={{ color: "var(--navy)" }}>{c.title}</strong>
            <div className="small muted">{c.reason}</div>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <Link href="/decisions" className="btn-primary">Continue to decisions <IconArrowR size={16} /></Link>
        </div>
      </div>
    </div>
  );
}
