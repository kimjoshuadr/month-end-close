"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../../lib/engine";
import { isEditableTarget, nextShortcut, type ShortcutAction } from "../../lib/shortcuts";
import type { Flag } from "../../lib/types";
import { useStore } from "../../state/store";
import { PageHeader, SummaryStrip } from "../../components/Shell";
import { fmtDelta, fmtMoney } from "../../components/format";
import { useToasts } from "../../components/Toasts";

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

function Detail({ flag, done, onAdvance, cmd, onCmd }: {
  flag: Flag;
  done: number;
  onAdvance: (excludeId: string) => void;
  cmd: ShortcutAction | null;
  onCmd: () => void;
}) {
  const { computed, packet, answers, overrides, setAnswer, setOverride } = useStore();
  const { push } = useToasts();
  const [pick, setPick] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pulse, setPulse] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const toastNi = (before: number, after: number) => {
    const d = Math.round((after - before) * 100) / 100;
    return d;
  };

  const commitAnswer = (answer: { option?: string; ack?: boolean }, label: string) => {
    if (!packet || !computed) return;
    const before = computed.netIncomeAdj;
    const after = compute(packet, { ...answers, [flag.id]: answer }, overrides).netIncomeAdj;
    const d = toastNi(before, after);
    setAnswer(flag.id, { ...answers[flag.id], ...answer });
    push(`${label}: net income ${fmtDelta(d)}`, { ni: d, undo: true });
  };

  const save = () => {
    if (flag.kind === "info" || effective === undefined || saving) return;
    setSaving(true);
    const opt = flag.options.find((o) => o.id === effective);
    window.setTimeout(() => {
      commitAnswer({ option: effective }, "Answer saved");
      setTranscript((t) => [...t, { from: "Studio saved", text: `Answer recorded: ${opt?.label ?? effective}.` }]);
      setPick(null);
      setSaving(false);
      onAdvance(flag.id);
    }, 150);
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // Keyboard commands from the worklist (1-3 choose, Enter saves).
  useEffect(() => {
    if (!cmd) return;
    if (cmd === "opt-1" || cmd === "opt-2" || cmd === "opt-3") {
      const o = flag.options[Number(cmd.slice(-1)) - 1];
      if (o) {
        if (flag.kind === "info") {
          commitAnswer({ ack: true }, "Item acknowledged");
          onAdvance(flag.id);
        } else setPick(o.id);
      }
    } else if (cmd === "save") {
      saveRef.current();
    }
    onCmd();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmd]);

  const send = async () => {
    const say = (inputRef.current?.value ?? "").trim();
    if (!say || busy) return;
    setBusy(true);
    if (inputRef.current) inputRef.current.value = "";
    setTranscript((t) => [...t, { from: "You", text: say }]);
    try {
      const res = await fetch("/api/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flagId: flag.id, text: say, options: flag.options }) });
      const r = (await res.json()) as { option?: string; amount?: number; explanation: string };
      setTranscript((t) => [...t, { from: "Studio", text: r.explanation }]);
      if (r.option !== undefined) {
        setPulse(r.option);
        window.setTimeout(() => setPulse((p) => (p === r.option ? null : p)), 700);
        if (flag.kind === "info") {
          commitAnswer({ ack: true }, "Item acknowledged");
          onAdvance(flag.id);
        } else {
          commitAnswer({ option: r.option }, "Answer saved");
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
  const st = statusOf(flag, answers);

  return (
    <div className="panel detail-in" key={flag.id}>
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
              {flag.options.map((o, i) => (
                <label
                  key={o.id}
                  className={`opt${effective === o.id ? " on" : ""}${hovered === o.id && effective !== o.id ? " previewing" : ""}${pulse === o.id ? " pulse-once" : ""}`}
                  onMouseEnter={() => setHovered(o.id)}
                  onMouseLeave={() => setHovered((h) => (h === o.id ? null : h))}
                  title={i < 3 ? `Shortcut: ${i + 1}` : undefined}
                >
                  <input
                    type="radio"
                    name={`flag-${flag.id}`}
                    checked={effective === o.id}
                    onChange={() => {
                      if (flag.kind === "info") {
                        commitAnswer({ ack: true }, "Item acknowledged");
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
              <button className={`btn primary small${saving ? " loading" : ""}`} onClick={save} disabled={saving}>
                {saving && <span className="spin" aria-hidden="true" />}
                {saving ? "Saving…" : "Save answer"}
              </button>
            )}
            <label className="f" htmlFor={`c-${flag.id}`}>Comments / reply</label>
            <div className="replyrow" style={{ display: "flex", gap: 8 }}>
              <input ref={inputRef} id={`c-${flag.id}`} type="text" placeholder="e.g. it was a loan…" aria-label={`Reply about ${flag.title}`} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
              <button className={`btn small${busy ? " loading" : ""}`} disabled={busy} onClick={send}>
                {busy && <span className="spin" aria-hidden="true" />}
                {busy ? "…" : "Send"}
              </button>
            </div>
            {(transcript.length > 0 || busy) && (
              <div className="transcript" aria-live="polite" style={{ background: "var(--canvas)", border: "1px solid var(--border-soft)", borderRadius: 4, padding: "8px 10px", marginTop: 8, fontSize: 12.5 }}>
                {transcript.map((m, i) => <div key={i}><strong>{m.from}:</strong> {m.text}</div>)}
                {busy && <div className="typing" aria-label="Studio is replying"><i /><i /><i /></div>}
              </div>
            )}
          </div>
          <div>
            <label className="f">Status</label>
            <div><span key={st.text} className={`st ${st.cls} swap`}>{st.text}</span></div>
            <label className="f">Adjusted net income</label>
            <div className="num" style={{ fontSize: 16, fontWeight: 700, color: "var(--navy)", textAlign: "left" }}>
              ${fmtMoney(computed.netIncomeAdj)}
            </div>
            {hovered && niFor[hovered] !== undefined && hovered !== effective && (
              <div className="small preview-ni" aria-live="polite">would be <span className="num">${fmtMoney(niFor[hovered])}</span></div>
            )}
            <label className="f">Progress</label>
            <div className="small muted detail-in" key={done}>{done} of {computed.proposal.flags.length} resolved</div>
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
  const [cmd, setCmd] = useState<ShortcutAction | null>(null);
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
  const allDone = computed && done === flags.length;

  useEffect(() => {
    if (computed && selected === null && flags.length > 0) {
      setSelected(flags.find((f) => !statusOf(f, answers).done)?.id ?? flags[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computed, flags.length, selected]);

  // Keep the selection bar in view as it slides between rows.
  useEffect(() => {
    if (!selected) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector(`[data-flag="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [selected]);

  // j/k move, 1-3 choose, Enter saves. Ignored while typing.
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target) || e.ctrlKey || e.metaKey) return;
      const { action } = nextShortcut(false, e.key, false);
      if (action === "next-item" || action === "prev-item") {
        e.preventDefault();
        const ids = flags.map((f) => f.id);
        const i = ids.indexOf(selected ?? "");
        const n = action === "next-item" ? 1 : -1;
        const next = ids[(i + n + ids.length) % ids.length];
        if (next) setSelected(next);
      } else if (action === "opt-1" || action === "opt-2" || action === "opt-3" || action === "save") {
        if (active) {
          e.preventDefault();
          setCmd(action);
        }
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flags, selected, active?.id]);

  const advance = (excludeId: string) => {
    const next = flags.find((f) => f.id !== excludeId && !statusOf(f, answers).done);
    if (next) setSelected(next.id);
  };

  if (!computed) {
    return (
      <div>
        <PageHeader crumb="Open Items" title="Open Items — judgment needed" final={final} unresolved={0} empty />
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
        <div className="panel-h">Worklist · <span className="detail-in" key={done}>{done} of {flags.length} resolved</span></div>
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
                  <tr key={f.id} data-flag={f.id} className={`clickable${selected === f.id ? " selected" : ""}`} onClick={() => setSelected(f.id)} onKeyDown={(e) => { if (e.key === "Enter") setSelected(f.id); }} tabIndex={0} aria-selected={selected === f.id}>
                    <td><strong style={{ color: "var(--navy)" }}>{f.title}</strong></td>
                    <td>{f.kind === "info" ? "Info" : "Decision"}</td>
                    <td className="num">{stake === null ? "—" : `$${stake.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</td>
                    <td><span key={st.text} className={`st ${st.cls} swap`}>{st.text}</span></td>
                    <td className="small muted">{def}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {allDone ? (
        <div className="panel"><div className="panel-b alldone">
          <div className="big">All items resolved</div>
          <div className="muted small" style={{ marginBottom: 10 }}>Every judgment call is recorded. Reports are ready to review.</div>
          <Link className="btn primary small" href="/statements">Review Financial Statements</Link>
        </div></div>
      ) : (
        active && <Detail key={active.id} flag={active} done={done} onAdvance={advance} cmd={cmd} onCmd={() => setCmd(null)} />
      )}
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
