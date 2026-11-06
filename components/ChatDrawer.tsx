"use client";

import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { IconX } from "./icons";

const SUGGESTED = ["Why wasn't Green Valley booked?", "Explain the payroll accrual", "What happens if the $5k is revenue?"];

export function ChatDrawer({ onClose }: { onClose: () => void }) {
  const { computed } = useStore();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [msgs, setMsgs] = useState<{ role: string; content: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((j) => setEnabled(j.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const context = computed
    ? {
        netIncomeUnadj: computed.netIncomeUnadj, netIncomeAdj: computed.netIncomeAdj, balanced: computed.balanced, unresolved: computed.unresolved,
        ajes: computed.proposal.ajes.map((a) => ({ id: a.id, title: a.title, status: a.status, assumed: a.assumed, lines: a.lines })),
        flags: computed.proposal.flags, checked: computed.proposal.checked, ties: computed.proposal.ties,
      }
    : null;

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    if (inputRef.current) inputRef.current.value = "";
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [...msgs, { role: "user", content: question }], context }) });
      const j = await res.json();
      setMsgs((m) => [...m, { role: "assistant", content: (j.reply ?? j.message) as string }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Ask AI is unavailable. The close works fully with the worklist buttons." }]);
    }
    setBusy(false);
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="drawer wide" role="dialog" aria-modal="true" aria-label="Ask AI assistant" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Assistant</p>
            <strong className="drawer-title">Ask AI</strong>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label="Close assistant" autoFocus><IconX /></button>
        </header>
        <div className="drawer-body">
          <div className="chatlog" ref={logRef}>
            {enabled === false && (
              <div className="alert info">Ask AI is disabled: no <code>DEEPSEEK_API_KEY</code> is configured. It explains and cites but never changes numbers.</div>
            )}
            {msgs.length === 0 && enabled !== false && <p className="muted small">Ask about the entries, worklist, or reports. Answers cite the draft numbers; the assistant cannot change them.</p>}
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>{m.content}</div>
            ))}
            {busy && <div className="msg assistant">Thinking…</div>}
          </div>
          <div className="chips">
            {SUGGESTED.map((s) => (
              <button key={s} disabled={!enabled || busy} onClick={() => ask(s)}>{s}</button>
            ))}
          </div>
          <div className="chatinput">
            <input ref={inputRef} type="text" placeholder={enabled ? "Ask about this close…" : "Disabled without API key"} aria-label="Ask AI" disabled={!enabled} onKeyDown={(e) => { if (e.key === "Enter") ask(e.currentTarget.value); }} />
            <button className="btn small primary" disabled={!enabled || busy} onClick={() => ask(inputRef.current?.value ?? "")}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
