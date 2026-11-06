"use client";

import { useMemo, useRef, useState } from "react";
import { compute } from "../lib/engine";
import type { Computed, Flag } from "../lib/types";
import { useStore } from "../state/store";
import { fmtMoney } from "./format";

export function FlagCard({ flag, computed }: { flag: Flag; computed: Computed }) {
  const { packet, answers, overrides, setAnswer, setOverride } = useStore();
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ from: string; text: string }[]>([]);
  const [nonce, setNonce] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = flag.kind === "info" ? (answers[flag.id]?.ack ? "ack" : undefined) : (answers[flag.id]?.option ?? flag.defaultOption);
  const answered = flag.kind === "info" ? !!answers[flag.id]?.ack : answers[flag.id]?.option !== undefined;

  const niFor = useMemo(() => {
    if (!packet) return {};
    const out: Record<string, number> = {};
    for (const o of flag.options) {
      const a = flag.kind === "info" ? { ack: true } : { option: o.id };
      out[o.id] = compute(packet, { ...answers, [flag.id]: a }, overrides).netIncomeAdj;
    }
    return out;
  }, [packet, answers, overrides, flag]);

  const send = async () => {
    const say = (inputRef.current?.value ?? "").trim();
    if (!say || busy) return;
    setBusy(true);
    if (inputRef.current) inputRef.current.value = "";
    setNonce((n) => n + 1);
    try {
      const res = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagId: flag.id, text: say, options: flag.options }) });
      const r = (await res.json()) as { option?: string; amount?: number; explanation: string };
      setTranscript((t) => [...t, { from: "You", text: say }, { from: "Tool", text: r.explanation }]);
      if (r.option !== undefined) {
        if (flag.kind === "info") setAnswer(flag.id, { ...answers[flag.id], ack: true });
        else setAnswer(flag.id, { ...answers[flag.id], option: r.option });
      }
      if (r.amount !== undefined && flag.id === "owner-transfer") {
        const opt = r.option ?? answers[flag.id]?.option ?? flag.defaultOption;
        if (opt !== "revenue") {
          setOverride("owner-transfer:0", r.amount);
          setOverride("owner-transfer:1", r.amount);
        }
      }
    } catch {
      setTranscript((t) => [...t, { from: "You", text: say }, { from: "Tool", text: "Reply failed. Pick an option above." }]);
    }
    setBusy(false);
  };

  return (
    <div className="card flagcard">
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{flag.title}</h3>
        <span style={{ flex: 1 }} />
        <span className={`badge ${answered ? "ok" : "draft"}`}>{answered ? "Answered" : "Unresolved"}</span>
      </div>
      <p className="small" style={{ marginTop: 8 }}>{flag.evidence}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {flag.options.map((o) => (
          <button
            key={o.id}
            className={`optbtn${current === o.id ? " selected" : ""}`}
            onClick={() => (flag.kind === "info" ? setAnswer(flag.id, { ...answers[flag.id], ack: true }) : setAnswer(flag.id, { ...answers[flag.id], option: o.id }))}
          >
            {o.label}
            {niFor[o.id] !== undefined && <span className="muted"> · NI ${fmtMoney(niFor[o.id])}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input key={nonce} ref={inputRef} type="text" placeholder="Type a reply (e.g. “it was a loan”)…" aria-label={`Reply to ${flag.title}`} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button className="btn secondary small" disabled={busy} onClick={send}>{busy ? "…" : "Send"}</button>
      </div>
      {transcript.length > 0 && (
        <div className="transcript" aria-live="polite">
          {transcript.map((m, i) => (
            <div key={i}><strong>{m.from}:</strong> {m.text}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export function NiSwing({ computed }: { computed: Computed }) {
  return <span className="muted small">Current adjusted net income ${fmtMoney(computed.netIncomeAdj)}; {computed.unresolved} unresolved.</span>;
}
