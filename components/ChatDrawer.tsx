"use client";

import { useEffect, useRef, useState } from "react";
import { buildChatContext } from "../lib/ai/context";
import { MAX_QUESTION_CHARS } from "../lib/ai/validate";
import { useStore } from "../state/store";
import { Dialog } from "./Dialog";
import { Markdown } from "./Markdown";

const SUGGESTED = ["Why wasn't Green Valley booked?", "Explain the payroll accrual", "What happens if the $5k is revenue?"];
const NO_ANSWER = "No answer came back. Try rephrasing.";

type Msg = { role: string; content: string; error?: boolean; retry?: string };

export function ChatDrawer({ onClose }: { onClose: () => void }) {
  const { computed, answers } = useStore();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch("/api/chat").then((r) => r.json()).then((j) => setEnabled(j.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, busy]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      abortRef.current?.abort();
    };
  }, [onClose]);

  const ask = async (raw: string) => {
    const question = raw.trim();
    if (!question || question.length > MAX_QUESTION_CHARS || busy) return;
    setQ("");
    // Error bubbles never go back to the API as history.
    const history = msgs.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    const ctl = new AbortController();
    abortRef.current = ctl;
    const timer = window.setTimeout(() => ctl.abort(), 30000);
    try {
      const context = computed ? buildChatContext(computed, answers) : null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: question }], context }),
        signal: ctl.signal,
      });
      const j = (await res.json()) as { reply?: string; message?: string };
      window.clearTimeout(timer);
      if (!res.ok) throw new Error(`error ${res.status}`);
      const reply = (j.reply ?? "").trim();
      setMsgs((m) => [...m, { role: "assistant", content: reply ? j.reply! : NO_ANSWER }]);
    } catch (e) {
      window.clearTimeout(timer);
      const why = e instanceof DOMException && e.name === "AbortError" ? "timed out" : (e as Error).message || "network error";
      setMsgs((m) => [...m, { role: "assistant", content: `Ask AI is unavailable (${why}). The close works fully with the worklist buttons.`, error: true, retry: question }]);
    }
    setBusy(false);
  };

  const over = q.length > MAX_QUESTION_CHARS;

  return (
    <Dialog label="Ask AI assistant" title="Ask AI" eyebrow="Assistant" wide onClose={onClose} closeLabel="Close assistant">
      <div className="chatlog" ref={logRef} aria-live="polite">
        {enabled === false && (
          <div className="alert info">Ask AI is disabled: no <code>DEEPSEEK_API_KEY</code> is configured. It explains and cites but never changes numbers.</div>
        )}
        {msgs.length === 0 && enabled !== false && <p className="muted small">Ask about the entries, worklist, or reports. Answers cite the draft numbers; the assistant cannot change them.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}${m.error ? " error" : ""}`}>
            {m.role === "assistant" && !m.error ? <Markdown text={m.content} /> : <span>{m.content}</span>}
            {m.error && m.retry !== undefined && (
              <button className="btn small" onClick={() => ask(m.retry!)}>Retry</button>
            )}
          </div>
        ))}
        {busy && <div className="msg assistant typing" aria-label="Waiting for reply"><i /><i /><i /></div>}
      </div>
      <div className="chips">
        {SUGGESTED.map((s) => (
          <button key={s} disabled={!enabled || busy} onClick={() => ask(s)}>{s}</button>
        ))}
      </div>
      <div className="chatinput">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            type="text"
            placeholder={enabled ? "Ask about this close… (max 1,000 chars)" : "Disabled without API key"}
            aria-label="Ask AI"
            aria-describedby="ask-count"
            disabled={!enabled || busy}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") ask(q); }}
          />
          <div id="ask-count" className={`charcount${over ? " over" : ""}`} aria-live="polite">
            {q.length.toLocaleString()} / {MAX_QUESTION_CHARS.toLocaleString()}{over ? " — too long" : ""}
          </div>
        </div>
        <button className={`btn small primary${busy ? " loading" : ""}`} disabled={!enabled || busy || !q.trim() || over} onClick={() => ask(q)}>
          {busy && <span className="spin" aria-hidden="true" />}Send
        </button>
      </div>
    </Dialog>
  );
}
