"use client";

import { useState } from "react";
import { signoffBlockers } from "../lib/signoff";
import { useStore } from "../state/store";
import { Dialog } from "./Dialog";
import { useToasts } from "./Toasts";

// Prepared/Reviewed sign-off. Confirm stays disabled until names validate
// and nothing is outstanding; the list above the inputs shows why.
export function SignoffDialog({ unresolved, unexplained, onClose }: {
  unresolved: number;
  unexplained: number;
  onClose: () => void;
}) {
  const { signOff } = useStore();
  const { push } = useToasts();
  const [preparedBy, setPreparedBy] = useState("");
  const [reviewedBy, setReviewedBy] = useState("");
  const blockers = signoffBlockers({ preparedBy, reviewedBy, unresolved, unexplained });

  const confirm = () => {
    if (blockers.length > 0) return;
    signOff(preparedBy.trim(), reviewedBy.trim());
    push("Marked as final", { undo: true });
    onClose();
  };

  return (
    <Dialog label="Sign off and mark as final" title="Mark as final" eyebrow="Sign-off" onClose={onClose} closeLabel="Close sign-off">
      {blockers.length > 0 ? (
        <div className="alert warn" role="alert">
          <strong>Before sign-off:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {blockers.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ) : (
        <div className="alert info">Everything is resolved and explained. Sign below to mark the close final.</div>
      )}
      <label className="f" htmlFor="signoff-prep">Prepared by</label>
      <input id="signoff-prep" type="text" autoComplete="off" placeholder="e.g. Dana Whitfield" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} />
      <label className="f" htmlFor="signoff-rev">Reviewed by</label>
      <input id="signoff-rev" type="text" autoComplete="off" placeholder="e.g. Kim Okafor" value={reviewedBy} onChange={(e) => setReviewedBy(e.target.value)} />
      <p className="small muted" style={{ marginTop: 8 }}>Names are typed, not authenticated (no login in this demo).</p>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button className="btn primary small" disabled={blockers.length > 0} onClick={confirm}>Confirm final</button>
        <button className="btn small" onClick={onClose}>Cancel</button>
      </div>
    </Dialog>
  );
}
