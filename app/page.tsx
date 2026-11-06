"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { PageHeader, SummaryStrip } from "../components/Shell";
import { IconCheck, IconDoc } from "../components/icons";

const EXPECTED = [
  { key: "workbook", label: "Workbook (.xlsx, or .csv trial balance)", hint: "Trial balance, payroll register, prepaid schedule, fixed assets" },
  { key: "supporting-documents", label: "Supporting PDF (or .txt)", hint: "Bank statement, invoices, client email" },
];

const ACCEPTED = [".xlsx", ".xls", ".pdf", ".txt", ".csv"];

function acceptedName(name: string): boolean {
  const lower = name.toLowerCase();
  return ACCEPTED.some((ext) => lower.endsWith(ext));
}

export default function PacketPage() {
  const { computed, packet, loading, missing, errors, final, loadSample, upload, resetSession } = useStore();
  const [over, setOver] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputKey = useRef<string | null>(null);

  const send = async (files: File[]) => {
    if (!files.length) return;
    const bad = files.filter((f) => !acceptedName(f.name));
    if (bad.length > 0) {
      setInvalid(`"${bad[0].name}" is not a packet file. Drop an .xlsx workbook, supporting .pdf/.txt, or .csv trial balance.`);
      return;
    }
    setInvalid(null);
    setNotice(null);
    const r = await upload(files);
    if (!r.ok) setNotice(`Packet incomplete. Missing: ${r.missing.join(", ") || "none"}. ${r.errors.join(" ")}`);
  };

  const browse = (key: string) => {
    inputKey.current = key;
    inputRef.current?.click();
  };

  const ties = useMemo(() => computed?.proposal.ties ?? [], [computed]);

  return (
    <div>
      <PageHeader
        crumb="Close Packet"
        title="Close Packet — September 2026"
        final={final}
        unresolved={computed?.unresolved ?? 0}
        empty={!computed}
        toolbar={
          <>
            <button className={`btn primary${loading ? " loading" : ""}`} disabled={loading} onClick={async () => { setNotice(null); await loadSample(); }}>
              {loading && <span className="spin" aria-hidden="true" />}
              {loading ? "Loading…" : "Load sample packet"}
            </button>
            {(computed) && (
              <button className="btn" onClick={() => { if (window.confirm("Reset this session? The packet, answers, edits, and audit log will be cleared.")) resetSession(); }}>
                Reset session
              </button>
            )}
          </>
        }
      />
      <SummaryStrip computed={computed} />

      <div className="panel">
        <div className="panel-h">Source files</div>
        {EXPECTED.map((f) => {
          const isMissing = !computed || missing.includes(f.key);
          return (
            <div key={f.key} className="urow">
              <IconDoc size={18} />
              <div className="grow">
                <strong style={{ color: "var(--navy)" }}>{f.label}</strong>
                <div className="small muted">{f.hint}</div>
              </div>
              <span className={`st ${computed && !isMissing ? "ok" : "unresolved"}`}>{computed && !isMissing ? "Loaded" : "Missing"}</span>
              <div
                className={`dropmini${over === f.key ? " over" : ""}${invalid && over === f.key ? " invalid" : ""}`}
                style={{ minWidth: 220 }}
                role="button"
                tabIndex={0}
                aria-label={loading ? `Parsing files…` : `Drop file or Browse — ${f.label}`}
                aria-busy={loading}
                onClick={() => browse(f.key)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") browse(f.key); }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if ([...(e.dataTransfer.items ?? [])].some((it) => it.kind === "file")) {
                    setOver(f.key);
                  }
                }}
                onDragLeave={() => { setOver(null); setInvalid(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  send([...e.dataTransfer.files]);
                }}
              >
                {loading ? "Parsing…" : over === f.key ? <span className="rel">Release to upload</span> : "Drop file or Browse"}
              </div>
            </div>
          );
        })}
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.pdf,.txt,.csv" style={{ display: "none" }} onChange={(e) => { send([...(e.target.files ?? [])]); e.target.value = ""; }} />
        {invalid && <div style={{ padding: "0 14px 12px" }}><div className="alert error" role="alert" style={{ margin: 0 }}>{invalid}</div></div>}
        {notice && <div style={{ padding: "0 14px 12px" }}><div className="alert error" style={{ margin: 0 }}>{notice}</div></div>}
        {errors.length > 0 && <div style={{ padding: "0 14px 12px" }}><div className="alert error" style={{ margin: 0 }}>{errors.map((e, i) => <div key={i}>{e}</div>)}</div></div>}
      </div>

      <div className="panel">
        <div className="panel-h">Validation and tie-outs</div>
        {!computed && !loading && <div className="panel-b muted">Load the sample packet or drop the two files to run validation.</div>}
        {loading && (
          <div className="gridwrap" role="region" aria-label="Validating files" aria-busy="true" tabIndex={0}>
            <table className="grid">
              <thead>
                <tr><th scope="col">Check</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Actual</th><th scope="col" className="num">Difference</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td><div className="skel" style={{ width: 130 }} /></td>
                    <td className="num"><div className="skel" style={{ width: 70, marginLeft: "auto" }} /></td>
                    <td className="num"><div className="skel" style={{ width: 70, marginLeft: "auto" }} /></td>
                    <td className="num"><div className="skel" style={{ width: 50, marginLeft: "auto" }} /></td>
                    <td><div className="skel" style={{ width: 44 }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {computed && !loading && (
          <div className="gridwrap" role="region" aria-label="Validation and tie-outs" tabIndex={0}>
            <table className="grid">
              <thead>
                <tr><th scope="col">Check</th><th scope="col" className="num">Expected</th><th scope="col" className="num">Actual</th><th scope="col" className="num">Difference</th><th scope="col">Status</th></tr>
              </thead>
              <tbody>
                {ties.map((t, i) => (
                  <tr key={t.label} className="row-in" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
                    <td>{t.label}</td>
                    <td className="num">{t.expected.toLocaleString()}</td>
                    <td className="num">{t.actual.toLocaleString()}</td>
                    <td className="num">{(t.actual - t.expected).toLocaleString()}</td>
                    <td><span className={`st ${t.ok ? "ok" : "bad"}`}>{t.ok ? "OK" : "Off"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {computed && (
        <div className="panel">
          <div className="panel-h">Extraction summary</div>
          <div className="panel-b small">
            TB {computed.adjTb.length} accounts · Bank {packet?.bank.lines.length ?? 0} activity lines ·{" "}
            {computed.proposal.ajes.filter((a) => a.status === "booked").length} entries drafted ·{" "}
            {computed.proposal.checked.length} items checked and left alone · {computed.proposal.flags.length} open items.
          </div>
        </div>
      )}
      <p className="small muted"><IconCheck size={12} /> Client data stays in this browser session; only file-parsing requests reach this server.</p>
    </div>
  );
}
