"use client";

import { useRef, useState } from "react";
import { useStore } from "../state/store";

const EXPECTED = [
  { key: "workbook", label: "Month-end workbook (.xlsx)" },
  { key: "supporting-documents", label: "Supporting documents (.pdf)" },
];

export default function UploadPage() {
  const { computed, loading, missing, errors, loadSample, upload } = useStore();
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async (files: File[]) => {
    if (!files.length) return;
    setNotice(null);
    const r = await upload(files);
    if (!r.ok) setNotice(`Could not build the packet. Missing: ${r.missing.join(", ") || "none"}. ${r.errors.join(" ")}`);
  };

  return (
    <div>
      <p className="eyebrow">Upload</p>
      <h1>Upload packet</h1>
      <p className="muted">Drop the workbook and supporting PDF, or run the one-click demo. Nothing leaves your browser session except file-parsing requests to this server.</p>

      <div className="card" style={{ textAlign: "center" }}>
        <button className="btn primary" disabled={loading} onClick={async () => { setNotice(null); await loadSample(); }}>
          {loading ? "Loading sample packet..." : "Load sample packet"}
        </button>
        <p className="small muted" style={{ marginBottom: 0 }}>Loads the Greenline September 2026 workbook and supporting documents from the server.</p>
      </div>

      <div className="card">
        <h2>Your files</h2>
        <div
          className={`dropzone${over ? " over" : ""}`}
          role="button"
          tabIndex={0}
          aria-label="Drop packet files here or activate to browse"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); send([...e.dataTransfer.files]); }}
        >
          Drop .xlsx and .pdf files here, or click to browse.
          <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.pdf" style={{ display: "none" }} onChange={(e) => send([...(e.target.files ?? [])])} />
        </div>
        {notice && <div className="alert error" style={{ marginTop: 12 }}>{notice}</div>}
        {errors.length > 0 && (
          <div className="alert error" style={{ marginTop: 12 }}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          {EXPECTED.map((f) => {
            const isMissing = missing.includes(f.key);
            const loaded = computed && (f.key === "workbook" ? computed.proposal.ties.length > 0 : true);
            return (
              <div key={f.key} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0" }}>
                <span className={`badge ${computed && !isMissing ? "ok" : "notbooked"}`}>{computed && !isMissing ? "Loaded" : "Missing"}</span>
                <span>{f.label}</span>
                {loaded && computed && !isMissing && <span className="small muted">ready</span>}
              </div>
            );
          })}
        </div>
      </div>

      {computed && (
        <div className="card">
          <h2>Extraction summary and tie-outs</h2>
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr><th>Check</th><th className="num">Expected</th><th className="num">Actual</th><th>Status</th></tr>
              </thead>
              <tbody>
                {computed.proposal.ties.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label}</td>
                    <td className="num">{t.expected.toLocaleString()}</td>
                    <td className="num">{t.actual.toLocaleString()}</td>
                    <td><span className={`badge ${t.ok ? "ok" : "bad"}`}>{t.ok ? "OK" : "Off"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
