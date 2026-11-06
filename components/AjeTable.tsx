"use client";

import { useState } from "react";
import type { Computed } from "../lib/types";
import { useStore } from "../state/store";
import { fmtMoney } from "./format";

function AmtInput({ ajeId, idx, value }: { ajeId: string; idx: number; value: number }) {
  const { setOverride } = useStore();
  const [text, setText] = useState<string | null>(null);
  const shown = text ?? String(value);
  const commit = () => {
    if (text === null) return;
    const n = Number(text.replace(/[$,]/g, ""));
    if (text.trim() === "" || !Number.isFinite(n) || n < 0) {
      setText(null); // Reject blank, non-numeric, or negative: revert.
      return;
    }
    setOverride(`${ajeId}:${idx}`, n);
    setText(null);
  };
  return (
    <input
      className="amt"
      aria-label={`Amount for entry ${ajeId} line ${idx + 1}`}
      value={shown}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setText(null);
      }}
    />
  );
}

export function AjeTable({ computed }: { computed: Computed }) {
  const names = new Map(computed.adjTb.map((r) => [r.no, r.name]));
  return (
    <div>
      {computed.proposal.ajes.map((a) => {
        const dr = a.lines.reduce((s, l) => s + l.debit, 0);
        const cr = a.lines.reduce((s, l) => s + l.credit, 0);
        const ok = Math.abs(dr - cr) < 0.005;
        return (
          <div className="card" key={a.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{a.title}</h3>
              <span className={`badge ${a.status === "booked" ? "booked" : "notbooked"}`}>{a.status === "booked" ? "Booked" : "Not booked"}</span>
              {a.assumed && <span className="badge assumed">Assumed, unconfirmed</span>}
              <span style={{ flex: 1 }} />
              <span className={`badge ${ok ? "ok" : "bad"}`}>{ok ? "Dr = Cr" : "Unbalanced"}</span>
            </div>
            <div className="tablewrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Acct</th>
                    <th>Account</th>
                    <th className="num">Debit</th>
                    <th className="num">Credit</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {a.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="num">{l.acct}</td>
                      <td>{names.get(l.acct) ?? ""}</td>
                      <td className="num">{l.debit !== 0 || l.credit === 0 ? <AmtInput ajeId={a.id} idx={i} value={l.debit} /> : fmtMoney(0)}</td>
                      <td className="num">{l.credit !== 0 || l.debit === 0 ? <AmtInput ajeId={a.id} idx={i} value={l.credit} /> : fmtMoney(0)}</td>
                      <td className="src">{l.source}</td>
                    </tr>
                  ))}
                  <tr className="subtotal">
                    <td colSpan={2}>Total</td>
                    <td className="num">{fmtMoney(dr)}</td>
                    <td className="num">{fmtMoney(cr)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function NetIncomeBridge({ computed }: { computed: Computed }) {
  const adj = computed.netIncomeAdj - computed.netIncomeUnadj;
  return (
    <div className="stat-cards">
      <div className="stat">
        <div className="k">Unadjusted net income</div>
        <div className="v">${fmtMoney(computed.netIncomeUnadj)}</div>
      </div>
      <div className="stat accent">
        <div className="k">Adjustments</div>
        <div className="v">{adj < 0 ? "-" : "+"}${fmtMoney(Math.abs(adj))}</div>
      </div>
      <div className="stat">
        <div className="k">Adjusted net income</div>
        <div className="v">${fmtMoney(computed.netIncomeAdj)}</div>
      </div>
      <div className="stat">
        <div className="k">Balance check</div>
        <div className="v" style={{ fontSize: 16 }}>{computed.balanced ? "Dr = Cr" : "Out of balance"}</div>
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const { loadSample } = useStore();
  const [busy, setBusy] = useState(false);
  return (
    <div className="card" style={{ textAlign: "center", padding: 40 }}>
      <p className="eyebrow">No data</p>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
      <button className="btn primary" disabled={busy} onClick={async () => { setBusy(true); await loadSample(); setBusy(false); }}>
        {busy ? "Loading..." : "Load sample packet"}
      </button>
    </div>
  );
}
