"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../../lib/engine";
import type { Flag } from "../../lib/types";
import { useStore } from "../../state/store";
import { PageHeader, SummaryStrip } from "../../components/Shell";
import { fmtMoney } from "../../components/format";

function stakeOf(flagId: string, computed: NonNullable<ReturnType<typeof useStore>["computed"]>): number | null {
  const a = computed.proposal.ajes.find((x) => x.flagId === flagId);
  if (!a) return null;
  const line = a.lines.find((l) => l.debit > 0 || l.credit > 0);
  return line ? Math.max(line.debit, line.credit) : null;
}

function statusOf(flag: Flag, answers: Record<string, { option?: string; ack?: boolean }>): { cls: string; text: string; done: boolean } {
  if (flag.kind === "info") {
    return answers[flag.id]?.ack ? { cls: "answered", text: "Acknowledged", done: true } : { cls: "unresolved", text: "Unresolved", done: false };
  }
  return answers[flag.id]?.option !== undefined
    ? { cls: "answered", text: "Answered", done: true }
    : { cls: "unresolved", text: "Unresolved", done: false };
}

function Detail({ flag, done, onAdvance }: { flag: Flag; done: number; onAdvance: (excludeId: string) => void }) {
  const { computed, packet, answers, overrides, setAnswer, setOverride } = useStore();
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState<{ from: string; text: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const niFor = useMemo(() => {
    if (!packet || !computed) return {} as Record<string, number>;
    const out: Record<string, number> = {};
    for (const o of flag.options) {
      const a = flag.kind === "info" ? { ack: true } : { option: o.id };
      out[o.id] = compute(packet, { ...answers, [flag.id]: a }, overrides).netIncomeAdj;
    }
    return out;
  }, [packet, computed, flag, answers, overrides]);

  if (!computed) return null;
  const current = flag.kind === "info" ? undefined : (answers[flag.id]?.option ?? flag.defaultOption);
  const effective = pick ?? current;

  const save = () => {
    if (flag.kind === "info" || effective === undefined) return;
    setAnswer(flag.id, { ...answers[flag.id], option: effective });
    setTranscript((t) => [...t, { from: "Studio saved", text: `Answer recorded: ${flag.options.find((o) => o.id === effective)?.label}.` }]);
    setPick(null);
    onAdvance(flag.id);
  };

  const send = async () => {
    const say = (inputRef.current?.value ?? "").trim();
    if (!say || busy) return;
    setBusy(true);
    if (inputRef.current) inputRef.current.value = "";
    try {
      const res = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagId: flag.id, text: say, options: flag.options }) });
      const r = (await res.json()) as { option?: string; amount?: number; explanation: string };
      setTranscript((t) => [...t, { from: "You", text: say }, { from: "Studio", text: r.explanation }]);
      if (r.option !== undefined) {
        if (flag.kind === "info") {
          setAnswer(flag.id, { ...answers[flag.id], ack: true });
          onAdvance(flag.id);
        } else {
          setAnswer(flag.id, { ...answers[flag.id], option: r.option });
          setPick(null);
        }
      }
      if (r.amount !== undefined && flag.id === "owner-transfer") {
        const opt = r.option ?? answers[flag.id]?.option ?? flag.defaultOption;
        if (opt !== "revenue") {
          setOverride("owner-transfer:0", r.amount);
          setOverride("owner-transfer:1", r.amount);
        }
      }
    } catch {
      setTranscript((t) => [...t, { from: "You", text: say }, { from: "Studio", text: "Reply failed. Use the options above." }]);
    }
    setBusy(false);
  };

  const bullets = flag.evidence.split(/(?<=\.)\s+(?=[A-Z])/).filter((b) => b.trim().length > 0);

  return (
    <div className="panel">
      <div className="panel-h">{flag.title}</div>
      <div className="panel-b">
        <div className="detail">
          <div>
            <label className="f">Description</label>
            <ul className="small" style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              {bullets.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
            <label className="f">{flag.kind === "info" ? "Acknowledgement" : "Options (net income effect)"}</label>
            <div className="radio-list" role="radiogroup" aria-label={flag.title}>
              {flag.options.map((o) => (
                <label key={o.id} className={`opt${effective === o.id ? " on" : ""}`}>
                  <input
                    type="radio"
                    name={`flag-${flag.id}`}
                    checked={effective === o.id}
                    onChange={() => {
                      if (flag.kind === "info") {
                        setAnswer(flag.id, { ...answers[flag.id], ack: true });
                        onAdvance(flag.id);
                      } else setPick(o.id);
                    }}
                  />
                  <span>{o.label}{o.id === flag.defaultOption && !/default/i.test(o.label) ? " (default)" : ""}</span>
                  <span className="ni">NI ${fmtMoney(niFor[o.id] ?? 0)}{o.id === "loan" && flag.id === "owner-transfer" ? " · new account, not in TB, requires approval" : ""}</span>
                </label>
              ))}
            </div>
            {flag.kind === "decision" && (
              <button className="btn primary small" onClick={save}>Save answer</button>
            )}
            <label className="f" htmlFor={`c-${flag.id}`}>Comments / reply</label>
            <div className="replyrow" style={{ display: "flex", gap: 8 }}>
              <input ref={inputRef} id={`c-${flag.id}`} type="text" placeholder="e.g. it was a loan…" aria-label={`Reply about ${flag.title}`} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
              <button className="btn small" disabled={busy} onClick={send}>{busy ? "…" : "Send"}</button>
            </div>
            {transcript.length > 0 && (
              <div className="transcript" aria-live="polite" style={{ background: "var(--canvas)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "8px 10px", marginTop: 8, fontSize: 12.5 }}>
                {transcript.map((m, i) => <div key={i}><strong>{m.from}:</strong> {m.text}</div>)}
              </div>
            )}
          </div>
          <div>
            <label className="f">Status</label>
            <div><span className={`st ${statusOf(flag, answers).cls}`}>{statusOf(flag, answers).text}</span></div>
            <label className="f">Progress</label>
            <div className="small muted">{done} of {computed.proposal.flags.length} resolved</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Body() {
  const { computed, answers, final } = useStore();
  const sel = useSearchParams().get("sel");
  const [selected, setSelected] = useState<string | null>(sel);
  if (!computed) {
    return (
      <div>
        <PageHeader crumb="Open Items" title="Open Items" final={final} unresolved={0} empty />
        <SummaryStrip computed={null} />
        <div className="panel"><div className="panel-b muted">Load the packet to see the items that need your judgment.</div></div>
      </div>
    );
  }
  const flags = computed?.proposal.flags ?? [];
  const done = computed ? flags.filter((f) => statusOf(f, answers).done).length : 0;
  const active = flags.find((f) => f.id === selected) ?? null;

  useEffect(() => {
    if (computed && selected === null && flags.length > 0) {
      setSelected(flags.find((f) => !statusOf(f, answers).done)?.id ?? flags[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, flags.length, selected]);

  const advance = (excludeId: string) => {
    const next = flags.find((f) => f.id !== excludeId && !statusOf(f, answers).done);
    if (next) setSelected(next.id);
  };

  if (!computed) {
    return (
      <div>
        <PageHeader crumb="Open Items" title="Open Items" final={final} unresolved={0} empty />
        <SummaryStrip computed={null} />
        <div className="panel"><div className="panel-b muted">Load the packet to see the items that need your judgment.</div></div>
      </div>
    );
  }
  return (
    <div>
      <PageHeader crumb="Open Items" title="Open Items — judgment needed" final={final} unresolved={computed.unresolved} />
      <SummaryStrip computed={computed} />
      <div className="panel">
        <div className="panel-h">Worklist · {done} of {flags.length} resolved</div>
        <div className="gridwrap" role="region" aria-label="Open items worklist" tabIndex={0}>
          <table className="grid">
            <thead>
              <tr><th scope="col">Item</th><th scope="col">Type</th><th scope="col" className="num">At stake</th><th scope="col">Status</th><th scope="col">Default</th></tr>
            </thead>
            <tbody>
              {flags.map((f) => {
                const st = statusOf(f, answers);
                const stake = stakeOf(f.id, computed);
                const def = f.options.find((o) => o.id === f.defaultOption)?.label ?? f.defaultOption;
                return (
                  <tr key={f.id} className={`clickable${selected === f.id ? " selected" : ""}`} onClick={() => setSelected(f.id)} onKeyDown={(e) => { if (e.key === "Enter") setSelected(f.id); }} tabIndex={0}>
                    <td><strong style={{ color: "var(--navy)" }}>{f.title}</strong></td>
                    <td>{f.kind === "info" ? "Info" : "Decision"}</td>
                    <td className="num">{stake === null ? "—" : `$${stake.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                    <td><span className={`st ${st.cls}`}>{st.text}</span></td>
                    <td className="small muted">{def}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {active && <Detail key={active.id} flag={active} done={done} onAdvance={advance} />}
    </div>
  );
}

export default function OpenItemsPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
