"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { compute } from "../lib/engine";
import { buildProposal } from "../lib/engine/proposal";
import type { Computed } from "../lib/types";
import { useStore } from "../state/store";
import { ajeNo, fmtDelta, fmtMoney } from "./format";
import { useDrill } from "./erp-ui";
import { useToasts } from "./Toasts";
import { Changed } from "./useChanged";
import { IconChevronR, IconPencil } from "./icons";

const REV = new Set([4000, 4100]);
const EXP = new Set([5000, 5100, 6000, 6010, 6100, 6110, 6120, 6130, 6140, 6150, 6160, 6170, 6180, 6190]);

export function niEffect(lines: { acct: number; debit: number; credit: number }[]): number {
  return lines
    .filter((l) => REV.has(l.acct) || EXP.has(l.acct))
    .reduce((s, l) => s + l.credit - l.debit, 0);
}

type Filter = "all" | "booked" | "assumed" | "notbooked";

function statusOf(a: { status: string; assumed: boolean }): Filter {
  if (a.status !== "booked") return "notbooked";
  return a.assumed ? "assumed" : "booked";
}

function side0(l: { debit: number; credit: number }): number {
  return l.debit !== 0 ? l.debit : l.credit;
}

// Grid-based journal with expandable record panels and inline editing.
export function JournalGrid({ computed, initialSel }: { computed: Computed; initialSel: string | null }) {
  const { packet, answers, overrides, setOverride } = useStore();
  const { push } = useToasts();
  const { open } = useDrill();
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(initialSel);
  const [closing, setClosing] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [nonce, setNonce] = useState(0);
  const base = useMemo(() => (packet ? buildProposal(packet, answers) : null), [packet, answers]);
  const names = useMemo(() => new Map(computed.adjTb.map((r) => [r.no, r.name])), [computed]);
  const closeTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const toggle = (id: string, isOpen: boolean) => {
    window.clearTimeout(closeTimer.current);
    if (isOpen) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setClosing(id);
      setExpanded(null);
      closeTimer.current = window.setTimeout(() => setClosing(null), reduced ? 0 : 200);
    } else {
      setClosing(null);
      setExpanded(id);
    }
  };

  const rows = computed.proposal.ajes.filter((a) => filter === "all" || statusOf(a) === filter);

  return (
    <div className="panel">
      <div className="panel-h">
        Journal entries
        <span style={{ flex: 1 }} />
        <label className="small muted" htmlFor="jfilter" style={{ fontWeight: 400 }}>Status</label>
        <select id="jfilter" value={filter} onChange={(e) => setFilter(e.target.value as Filter)} style={{ width: 150 }}>
          <option value="all">All</option>
          <option value="booked">Booked</option>
          <option value="assumed">Assumed</option>
          <option value="notbooked">Not booked</option>
        </select>
      </div>
      <div className="gridwrap" role="region" aria-label="Journal entries" tabIndex={0}>
        <table className="grid">
          <thead>
            <tr>
              <th scope="col" style={{ width: 28 }}><span className="sr">Expand</span></th>
              <th scope="col">Entry #</th>
              <th scope="col">Title</th>
              <th scope="col">Status</th>
              <th scope="col" className="num">Debit</th>
              <th scope="col" className="num">Credit</th>
              <th scope="col">Source</th>
              <th scope="col">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const dr = a.lines.reduce((s, l) => s + l.debit, 0);
              const cr = a.lines.reduce((s, l) => s + l.credit, 0);
              const isOpen = expanded === a.id;
              const isClosing = closing === a.id;
              const flag = a.flagId ? computed.proposal.flags.find((f) => f.id === a.flagId) : undefined;
              return [
                <tr key={a.id} className={isOpen ? "selected" : undefined}>
                  <td>
                    <button className="iconbtn" style={{ width: 24, height: 24 }} aria-expanded={isOpen} aria-label={`${isOpen ? "Collapse" : "Expand"} ${a.title}`} onClick={() => toggle(a.id, isOpen)}>
                      <span className={`chev${isOpen ? " open" : ""}`}><IconChevronR size={13} /></span>
                    </button>
                  </td>
                  <td className="mono">{ajeNo(a.id)}</td>
                  <td><strong style={{ color: "var(--navy)" }}>{a.title}</strong></td>
                  <td><span className={`st ${a.status !== "booked" ? "notbooked" : a.assumed ? "assumed" : "booked"}`}>{a.status !== "booked" ? "Not booked" : a.assumed ? "Assumed" : "Booked"}</span></td>
                  <td className="num"><Changed value={dr}>{fmtMoney(dr)}</Changed></td>
                  <td className="num"><Changed value={cr}>{fmtMoney(cr)}</Changed></td>
                  <td className="small muted">{a.lines[0] ? (a.lines[0].source.length > 40 ? a.lines[0].source.slice(0, 39) + "…" : a.lines[0].source) : "—"}</td>
                  <td className="small">{flag ? flag.title : "—"}</td>
                </tr>,
                (isOpen || isClosing) && (
                  <tr key={`${a.id}-detail`}>
                    <td colSpan={8} style={{ background: "#f7fafd", padding: 0 }} inert={!isOpen}>
                      <div className={`expand${isClosing ? " closing" : " enter"}`}>
                        <div>
                          <div style={{ padding: "12px 14px" }}>
                            <div className="hfields" style={{ marginBottom: 10 }}>
                              <div className="hf"><div className="k">Entry #</div><div className="v mono">{ajeNo(a.id)}</div></div>
                              <div className="hf"><div className="k">Date</div><div className="v">9/30/2026</div></div>
                              <div className="hf"><div className="k">Memo</div><div className="v">{a.title}</div></div>
                              <div className="hf"><div className="k">Status</div><div className="v">{a.status === "booked" ? (a.assumed ? "Booked · assumed" : "Booked") : "Not booked"}</div></div>
                            </div>
                            <table className="grid">
                              <thead>
                                <tr><th scope="col">Acct</th><th scope="col">Account</th><th scope="col" className="num">Debit</th><th scope="col" className="num">Credit</th><th scope="col">Source document</th></tr>
                              </thead>
                              <tbody>
                                {a.lines.map((l, i) => {
                                  const k = `${a.id}:${i}`;
                                  const baseLine = base?.ajes.find((b) => b.id === a.id)?.lines[i];
                                  const edited = k in overrides;
                                  const err = errs[k];
                                  const commit = (raw: string, side: "debit" | "credit") => {
                                    const t = raw.replace(/[$,]/g, "").trim();
                                    const n = Number(t);
                                    if (t === "" || !Number.isFinite(n) || n < 0) {
                                      setErrs((e) => ({ ...e, [k]: "Enter a non-negative number" }));
                                      setNonce((x) => x + 1);
                                      return;
                                    }
                                    setErrs((e) => {
                                      if (!(k in e)) return e;
                                      const c = { ...e };
                                      delete c[k];
                                      return c;
                                    });
                                    const cur = side === "debit" ? l.debit : l.credit;
                                    if (n !== cur && packet) {
                                      const after = compute(packet, answers, { ...overrides, [k]: n }).netIncomeAdj;
                                      const d = Math.round((after - computed.netIncomeAdj) * 100) / 100;
                                      setOverride(k, n);
                                      push(`Amount edited: net income ${fmtDelta(d)}`, { undo: true });
                                    }
                                  };
                                  const reset = () => {
                                    if (!baseLine || !packet) return;
                                    const n = side0(baseLine);
                                    const after = compute(packet, answers, { ...overrides, [k]: n }).netIncomeAdj;
                                    const d = Math.round((after - computed.netIncomeAdj) * 100) / 100;
                                    setOverride(k, n);
                                    push(`Amount reset: net income ${fmtDelta(d)}`, { undo: true });
                                  };
                                  const inputFor = (side: "debit" | "credit", shown: number) => (
                                    <span className="cellwrap">
                                      <IconPencil size={12} className="pencil" />
                                      <input
                                        className="cell"
                                        aria-label={`${a.title} ${side}`}
                                        aria-invalid={err ? true : undefined}
                                        aria-describedby={err ? `${k}-err` : undefined}
                                        key={`${k}:${shown}:${nonce}`}
                                        defaultValue={String(shown)}
                                        onBlur={(e) => commit(e.currentTarget.value, side)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                          else if (e.key === "Escape") {
                                            e.currentTarget.value = e.currentTarget.defaultValue;
                                            setErrs((prev) => {
                                              if (!(k in prev)) return prev;
                                              const c = { ...prev };
                                              delete c[k];
                                              return c;
                                            });
                                            (e.target as HTMLInputElement).blur();
                                          }
                                        }}
                                      />
                                      {edited && <span className="edited-dot" title="Edited" />}
                                    </span>
                                  );
                                  return (
                                    <tr key={i}>
                                      <td className="mono">{l.acct}</td>
                                      <td>{names.get(l.acct) ?? ""}</td>
                                      <td className="num">
                                        {l.debit !== 0 ? inputFor("debit", l.debit) : "0.00"}
                                        {err && l.debit !== 0 && <div className="cellerr" id={`${k}-err`} role="alert">{err}</div>}
                                      </td>
                                      <td className="num">
                                        {l.credit !== 0 ? inputFor("credit", l.credit) : "0.00"}
                                        {err && l.credit !== 0 && <div className="cellerr" id={`${k}-err`} role="alert">{err}</div>}
                                      </td>
                                      <td>
                                        <button className="linkbtn" style={{ fontSize: 12.5 }} onClick={() => open({ kind: "aje-line", ajeId: a.id, line: i })}>{l.source}</button>
                                        {edited && baseLine && (
                                          <> <button className="linkbtn" style={{ fontSize: 12 }} onClick={reset}>Reset</button></>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={2}>Totals · <button className="linkbtn" onClick={() => open({ kind: "entry", ajeId: a.id })}>drill down</button></td>
                                  <td className="num"><Changed value={dr}>{fmtMoney(dr)}</Changed></td>
                                  <td className="num"><Changed value={cr}>{fmtMoney(cr)}</Changed></td>
                                  <td>
                                    {(() => {
                                      const balanced = Math.abs(dr - cr) < 0.005;
                                      return (
                                        <span
                                          key={balanced ? "bal" : "unbal"}
                                          className={`st ${balanced ? "ok" : "bad shake"}`}
                                          title={balanced ? "Debits equal credits" : `Out of balance by ${fmtMoney(Math.abs(dr - cr))}`}
                                        >
                                          {balanced ? "Dr = Cr" : "Unbalanced"}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BridgeTable({ computed }: { computed: Computed }) {
  const booked = computed.proposal.ajes.filter((a) => a.status === "booked");
  return (
    <div className="panel">
      <div className="panel-h">Net income bridge</div>
      <div className="gridwrap" role="region" aria-label="Net income bridge" tabIndex={0}>
        <table className="grid">
          <thead><tr><th scope="col">Step</th><th scope="col" className="num">NI effect</th><th scope="col" className="num">Running NI</th></tr></thead>
          <tbody>
            <tr><td>Unadjusted</td><td className="num">—</td><td className="num">{fmtMoney(computed.netIncomeUnadj)}</td></tr>
            {(() => {
              let run = computed.netIncomeUnadj;
              return booked.map((a) => {
                const e = Math.round((niEffect(a.lines) + Number.EPSILON) * 100) / 100;
                run = Math.round((run + e) * 100) / 100;
                return <tr key={a.id}><td>{ajeNo(a.id)} · {a.title}</td><td className="num">{fmtMoney(e)}</td><td className="num"><Changed value={run}>{fmtMoney(run)}</Changed></td></tr>;
              });
            })()}
          </tbody>
          <tfoot><tr><td>Adjusted</td><td className="num">{fmtMoney(Math.round((computed.netIncomeAdj - computed.netIncomeUnadj) * 100) / 100)}</td><td className="num"><Changed value={computed.netIncomeAdj}>{fmtMoney(computed.netIncomeAdj)}</Changed></td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}
