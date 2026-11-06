"use client";

import { useState } from "react";
import { useStore } from "../../state/store";
import { PageHeader, SummaryStrip } from "../../components/Shell";

export default function AuditPage() {
  const { computed, audit, final } = useStore();
  const [q, setQ] = useState("");
  const rows = [...audit].reverse().filter((e) => e.msg.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div>
      <PageHeader crumb="Audit Trail" title="Audit Trail" final={final} unresolved={computed?.unresolved ?? 0} />
      <SummaryStrip computed={computed} />
      <div className="panel">
        <div className="panel-h">
          Session events
          <span style={{ flex: 1 }} />
          <input
            type="text"
            placeholder="Filter events…"
            aria-label="Filter audit events"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 220 }}
          />
        </div>
        {rows.length === 0 ? (
          <div className="panel-b muted">{audit.length === 0 ? "Nothing logged yet. Load a packet to start the trail." : "No events match this filter."}</div>
        ) : (
          <div className="gridwrap">
            <table className="grid">
              <thead><tr><th scope="col">Time</th><th scope="col">User</th><th scope="col">Action</th><th scope="col">Detail</th></tr></thead>
              <tbody>
                {rows.map((e, i) => {
                  const m = /^(\S[^:]*?):\s*(.*)$/.exec(e.msg);
                  return (
                    <tr key={i}>
                      <td style={{ whiteSpace: "nowrap" }} className="mono">{new Date(e.ts).toLocaleString()}</td>
                      <td>Accountant</td>
                      <td>{m ? m[1] : "Event"}</td>
                      <td className="small">{m ? m[2] : e.msg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="small muted">Kept in this browser session only. Nothing is sent anywhere.</p>
    </div>
  );
}
