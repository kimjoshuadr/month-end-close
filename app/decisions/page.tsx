"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { compute } from "../../lib/engine";
import { useStore } from "../../state/store";
import { EmptyStep } from "../../components/AjeTable";
import { fmtMoney } from "../../components/format";
import { IconArrowR, IconCheck, IconChevronL, IconChevronR } from "../../components/icons";

const QUESTIONS: Record<string, string> = {
  "owner-transfer": "What was the $5,000 really?",
  "ap-support": "Can you vouch for the other $9,490 in payables?",
  "aug-cutoff": "Fix August's cutoff, or leave it be?",
  "payroll-method": "Happy with the 3-of-10 accrual?",
  "revenue-class": "Is the revenue split right?",
  distributions: "Any distributions we missed?",
  northline: "Accrue October's rent in September?",
};

function highlight(text: string): React.ReactNode[] {
  const parts = text.split(/(\$[\d,]+(?:\.\d+)?)/g);
  return parts.map((p, i) => (/^\$/.test(p) ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>));
}

export default function DecisionsPage() {
  const { computed, packet, answers, overrides, setAnswer, setOverride } = useStore();
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [transcripts, setTranscripts] = useState<Record<string, { from: string; text: string }[]>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const flags = useMemo(() => computed?.proposal.flags ?? [], [computed]);
  const done = useMemo(
    () => flags.filter((f) => (f.kind === "info" ? !!answers[f.id]?.ack : answers[f.id]?.option !== undefined)).length,
    [flags, answers]
  );

  const niFor = useMemo(() => {
    if (!packet || !computed) return {} as Record<string, Record<string, number>>;
    const out: Record<string, Record<string, number>> = {};
    for (const f of flags) {
      out[f.id] = {};
      for (const o of f.options) {
        const a = f.kind === "info" ? { ack: true } : { option: o.id };
        out[f.id][o.id] = compute(packet, { ...answers, [f.id]: a }, overrides).netIncomeAdj;
      }
    }
    return out;
  }, [packet, computed, flags, answers, overrides]);

  if (!computed) return <EmptyStep title="Decisions are locked" body="Load the packet first — the open items appear once the entries are drafted." />;

  if (done === flags.length && flags.length > 0) {
    return (
      <div className="q-wrap">
        <div className="stephead">
          <p className="eyebrow">Step 3 of 4 · Decisions</p>
          <h2>All decisions made</h2>
          <p>Nothing left assumed without your say-so. The statements are ready to review.</p>
        </div>
        <div className="panel" style={{ textAlign: "center" }}>
          <span className="badge ok"><IconCheck size={12} /> {done} of {flags.length} resolved</span>
          <p className="muted">Adjusted net income ${fmtMoney(computed.netIncomeAdj)}</p>
          <Link href="/statements" className="btn-primary">Review statements <IconArrowR size={16} /></Link>
        </div>
      </div>
    );
  }

  const flag = flags[Math.min(idx, flags.length - 1)];
  if (!flag) return null;
  const current = flag.kind === "info" ? (answers[flag.id]?.ack ? "ack" : undefined) : (answers[flag.id]?.option ?? flag.defaultOption);
  const answered = flag.kind === "info" ? !!answers[flag.id]?.ack : answers[flag.id]?.option !== undefined;

  const choose = (option: string) => {
    if (flag.kind === "info") setAnswer(flag.id, { ...answers[flag.id], ack: true });
    else setAnswer(flag.id, { ...answers[flag.id], option });
  };

  const send = async () => {
    const input = inputRefs.current[flag.id];
    const say = (input?.value ?? "").trim();
    if (!say || busy) return;
    setBusy(true);
    if (input) input.value = "";
    try {
      const res = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagId: flag.id, text: say, options: flag.options }) });
      const r = (await res.json()) as { option?: string; amount?: number; explanation: string };
      setTranscripts((t) => ({ ...t, [flag.id]: [...(t[flag.id] ?? []), { from: "You", text: say }, { from: "Studio", text: r.explanation }] }));
      if (r.option !== undefined) choose(r.option);
      if (r.amount !== undefined && flag.id === "owner-transfer") {
        const opt = r.option ?? answers[flag.id]?.option ?? flag.defaultOption;
        if (opt !== "revenue") {
          setOverride("owner-transfer:0", r.amount);
          setOverride("owner-transfer:1", r.amount);
        }
      }
    } catch {
      setTranscripts((t) => ({ ...t, [flag.id]: [...(t[flag.id] ?? []), { from: "You", text: say }, { from: "Studio", text: "Reply failed. Pick a choice above." }] }));
    }
    setBusy(false);
  };

  return (
    <div className="q-wrap">
      <div className="stephead">
        <p className="eyebrow">Step 3 of 4 · Decisions · {done} of {flags.length} resolved</p>
        <h2 className="q-headline">{QUESTIONS[flag.id] ?? flag.title}</h2>
        <p className="muted">{flag.title}</p>
      </div>

      <div className="evidence">
        <p className="eyebrow">The evidence</p>
        <blockquote>{highlight(flag.evidence)}</blockquote>
        {answered && <span className="badge ok"><IconCheck size={12} /> Answered</span>}
      </div>

      <div className="choices" role="group" aria-label={`Choices for ${flag.title}`}>
        {flag.options.map((o) => (
          <button key={o.id} className={`choice${current === o.id ? " selected" : ""}`} onClick={() => choose(o.id)} aria-pressed={current === o.id}>
            <span className="c-label">{o.label}</span>
            <span className="c-ni">NI ${fmtMoney(niFor[flag.id]?.[o.id] ?? 0)}</span>
          </button>
        ))}
      </div>

      <p className="eyebrow">Or tell me in your own words</p>
      <div className="replyrow">
        <input
          ref={(el) => { inputRefs.current[flag.id] = el; }}
          type="text"
          placeholder="e.g. “it was a loan”…"
          aria-label={`Reply about ${flag.title}`}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button className="btn-primary small" disabled={busy} onClick={send}>{busy ? "…" : "Send"}</button>
      </div>
      {(transcripts[flag.id] ?? []).length > 0 && (
        <div className="transcript" aria-live="polite">
          {transcripts[flag.id].map((m, i) => (
            <div key={i}><strong>{m.from}:</strong> {m.text}</div>
          ))}
        </div>
      )}

      <div className="dots" role="tablist" aria-label="Decision progress">
        {flags.map((f, i) => {
          const fDone = f.kind === "info" ? !!answers[f.id]?.ack : answers[f.id]?.option !== undefined;
          return <button key={f.id} role="tab" aria-selected={i === idx} aria-label={`${f.title} (${fDone ? "answered" : "open"})`} className={`dot${fDone ? " done" : ""}${i === idx ? " current" : ""}`} onClick={() => setIdx(i)} />;
        })}
        <span className="small muted" style={{ marginLeft: 6 }}>{done}/{flags.length}</span>
      </div>

      <div className="qnav">
        <button className="btn-ghost small" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>
          <IconChevronL size={14} /> Back
        </button>
        {idx < flags.length - 1 ? (
          <button className="btn-ghost small" onClick={() => setIdx((i) => Math.min(flags.length - 1, i + 1))}>
            Next <IconChevronR size={14} />
          </button>
        ) : (
          <Link href="/statements" className="btn-primary small">To statements <IconArrowR size={14} /></Link>
        )}
      </div>
    </div>
  );
}
