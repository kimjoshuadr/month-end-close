"use client";

import { FlagCard } from "../../components/FlagCard";
import { EmptyState } from "../../components/AjeTable";
import { useStore } from "../../state/store";

export default function OpenItemsPage() {
  const { computed } = useStore();
  if (!computed) return <EmptyState title="No open items yet" body="Load the sample packet or upload the month-end files to see what needs the accountant's judgment." />;
  return (
    <div>
      <p className="eyebrow">Open items</p>
      <h1>Open items needing judgment</h1>
      <p className="muted">Booked defaults carry an assumed badge until you answer. Informational flags clear when you acknowledge them. {computed.unresolved} of {computed.proposal.flags.length} unresolved.</p>
      {computed.proposal.flags.map((f) => (
        <FlagCard key={f.id} flag={f} computed={computed} />
      ))}
    </div>
  );
}
