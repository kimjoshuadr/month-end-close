"use client";

import { AjeTable, EmptyState, NetIncomeBridge } from "../../components/AjeTable";
import { useStore } from "../../state/store";

export default function EntriesPage() {
  const { computed } = useStore();
  if (!computed) return <EmptyState title="No entries yet" body="Load the sample packet or upload the month-end files to draft the adjusting entries." />;
  return (
    <div>
      <p className="eyebrow">Entries</p>
      <h1>Adjusting journal entries</h1>
      <p className="muted">Every booked entry balances and cites its source. Click any amount to edit it; totals update live.</p>
      <NetIncomeBridge computed={computed} />
      <AjeTable computed={computed} />
      <div className="card">
        <h2>Checked, no entry needed</h2>
        {computed.proposal.checked.map((c, i) => (
          <div key={i} style={{ padding: "6px 0", borderBottom: "1px solid var(--grey-border)" }}>
            <strong>{c.title}</strong>
            <div className="src">{c.reason}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
