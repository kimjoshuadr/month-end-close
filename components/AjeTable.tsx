"use client";

import { useMemo } from "react";
import { buildProposal } from "../lib/engine/proposal";
import type { Computed } from "../lib/types";
import { useStore } from "../state/store";
import { fmtMoney } from "./format";
import { IconEye } from "./icons";
import { useUI } from "./studio";

// Journal-style ledger cards with source chips, inline editing, and trace.
export function LedgerCards({ computed }: { computed: Computed }) {
  const { packet, answers, overrides, setOverride } = useStore();
  const { openTrace } = useUI();
  const base = useMemo(() => (packet ? buildProposal(packet, answers) : null), [packet, answers]);
  const names = new Map(computed.adjTb.map((r) => [r.no, r.name]));

  return (
    <div>
      {computed.proposal.ajes.map((a) => {
        const dr = a.lines.reduce((s, l) => s + l.debit, 0);
        const cr = a.lines.reduce((s, l) => s + l.credit, 0);
        const ok = Math.abs(dr - cr) < 0.005;
        const edited = a.lines.some((_, i) => `${a.id}:${i}` in overrides);
        return (
          <article className={`ledger${a.assumed ? " assumed" : ""}${a.status !== "booked" ? " excluded" : ""}`} key={a.id}>
            <div className="ledger-head">
              <h3>{a.title}</h3>
              <span className={`badge ${a.status === "booked" ? "booked" : "notbooked"}`}>{a.status === "booked" ? "Booked" : "Not booked"}</span>
              {a.assumed && <span className="badge assumed">Assumed</span>}
              {edited && <span className="edited-flag">Edited</span>}
              <span className="spacer" />
              <span className={`badge ${ok ? "ok" : "bad"}`}>{ok ? "Dr = Cr" : "Unbalanced"}</span>
            </div>
            <div className="journal">
              {a.lines.map((l, i) => {
                const key = `${a.id}:${i}`;
                const baseLine = base?.ajes.find((b) => b.id === a.id)?.lines[i];
                const isEdited = key in overrides;
                const commit = (raw: string) => {
                  const n = Number(raw.replace(/[$,]/g, ""));
                  if (raw.trim() === "" || !Number.isFinite(n) || n < 0) return;
                  if (n !== (l.debit !== 0 ? l.debit : l.credit)) setOverride(key, n);
                };
                return (
                  <div className="jline" key={i}>
                    <span className="jacct">{l.acct}</span>
                    <span className="jname">{names.get(l.acct) ?? ""}</span>
                    <span className="jside">
                      {l.debit !== 0 ? (
                        <input className="amt" aria-label={`${a.title} debit`} key={`${key}:${l.debit}`} defaultValue={String(l.debit)} onBlur={(e) => commit(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                      ) : (
                        <span className="jamt muted">$0.00</span>
                      )}
                      {l.credit !== 0 ? (
                        <input className="amt" aria-label={`${a.title} credit`} key={`${key}:${l.credit}`} defaultValue={String(l.credit)} onBlur={(e) => commit(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                      ) : (
                        <span className="jamt muted">$0.00</span>
                      )}
                      {isEdited && baseLine && (
                        <button className="linkbtn" onClick={() => setOverride(key, baseLine.debit !== 0 ? baseLine.debit : baseLine.credit)}>Reset</button>
                      )}
                    </span>
                  </div>
                );
              })}
              <div className="jtotal">
                <button className="linkbtn" onClick={() => openTrace({ kind: "entry", ajeId: a.id })}>
                  <span className="num">Dr ${fmtMoney(dr)} · Cr ${fmtMoney(cr)}</span> — trace
                </button>
              </div>
            </div>
            <div className="srcchips">
              {a.lines.length > 0 && (
                <button className="srcchip" onClick={() => openTrace({ kind: "entry", ajeId: a.id })}>
                  <IconEye size={13} /> {a.lines[0].source.length > 52 ? a.lines[0].source.slice(0, 51) + "…" : a.lines[0].source}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function EmptyStep({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel" style={{ textAlign: "center", padding: 40 }}>
      <p className="eyebrow">Locked</p>
      <h2>{title}</h2>
      <p className="muted">{body}</p>
    </div>
  );
}

export const EmptyState = EmptyStep;
