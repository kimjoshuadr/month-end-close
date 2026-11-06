"use client";

import { useStore } from "../../state/store";

export default function AuditPage() {
  const { audit } = useStore();
  return (
    <div>
      <p className="eyebrow">Audit log</p>
      <h1>Audit log</h1>
      <p className="muted">Every parse, assumption answer, and manual edit, with timestamps. Kept in this browser session only.</p>
      <div className="card">
        {audit.length === 0 ? (
          <p className="muted">Nothing logged yet. Load a packet to start the trail.</p>
        ) : (
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr><th>Time</th><th>Event</th></tr>
              </thead>
              <tbody>
                {[...audit].reverse().map((e, i) => (
                  <tr key={i}>
                    <td className="num" style={{ textAlign: "left", whiteSpace: "nowrap" }}>{new Date(e.ts).toLocaleString()}</td>
                    <td>{e.msg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
