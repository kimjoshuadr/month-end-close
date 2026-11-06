"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";
import { IconArrowR, IconCheck, IconFile, IconReset, IconUpload } from "../components/icons";
import { usePrefersReducedMotion } from "../components/studio";

const FILES = [
  { key: "workbook", label: "Month-end workbook", sub: "Trial balance · payroll · prepaid · fixed assets" },
  { key: "supporting-documents", label: "Supporting documents", sub: "Bank statement · 4 invoices · client email" },
];

export default function PacketPage() {
  const { computed, loading, missing, errors, loadSample, upload, resetSession } = useStore();
  const [over, setOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduced = usePrefersReducedMotion();

  const ties = computed?.proposal.ties ?? [];
  const totalTicks = FILES.length + ties.length;
  const reading = !!computed && revealed < totalTicks;

  useEffect(() => {
    if (!computed) {
      setRevealed(0);
      return;
    }
    if (reduced) {
      setRevealed(totalTicks);
      return;
    }
    setRevealed(0);
    const id = window.setInterval(() => {
      setRevealed((r) => {
        if (r >= totalTicks) {
          window.clearInterval(id);
          return r;
        }
        return r + 1;
      });
    }, 380);
    return () => window.clearInterval(id);
  }, [computed, totalTicks, reduced]);

  const send = async (files: File[]) => {
    if (!files.length) return;
    setNotice(null);
    const r = await upload(files);
    if (!r.ok) setNotice(`Could not build the packet. Missing: ${r.missing.join(", ") || "none"}. ${r.errors.join(" ")}`);
  };

  const booked = computed?.proposal.ajes.filter((a) => a.status === "booked").length ?? 0;
  const checked = computed?.proposal.checked.length ?? 0;
  const flags = computed?.proposal.flags.length ?? 0;

  return (
    <div>
      <div className="stephead">
        <p className="eyebrow">Step 1 of 4 · Packet</p>
        <h2>What landed on your desk?</h2>
        <p>Drop in the September files. The studio reads them deterministically — every number below is traced to its document.</p>
      </div>

      {!computed && (
        <div className="hero">
          <div
            className={`hero-drop${over ? " over" : ""}`}
            role="button"
            tabIndex={0}
            aria-label="Drop packet files here or activate to browse"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setOver(true); }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); send([...e.dataTransfer.files]); }}
          >
            <IconUpload size={30} />
            <h3>Drop the .xlsx and .pdf here</h3>
            <p>or browse your files — or skip straight to the demo</p>
            <button
              className="btn-primary"
              disabled={loading}
              onClick={(e) => { e.stopPropagation(); setNotice(null); loadSample(); }}
            >
              {loading ? "Reading…" : "Load sample packet"}
            </button>
            <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.pdf" style={{ display: "none" }} onChange={(e) => send([...(e.target.files ?? [])])} />
          </div>
          {notice && <div className="alert error" style={{ marginTop: 12 }}>{notice}</div>}
          {errors.length > 0 && <div className="alert error" style={{ marginTop: 12 }}>{errors.map((e, i) => <div key={i}>{e}</div>)}</div>}
        </div>
      )}

      {computed && (
        <>
          <div className="panel" aria-live="polite">
            <p className="eyebrow">{reading ? "Reading the packet…" : "Packet read"}</p>
            {FILES.map((f, i) => {
              const miss = missing.includes(f.key);
              const on = i < revealed && !miss;
              return (
                <div className="file-row" key={f.key}>
                  <span className={`tick${on ? " on" : ""}`}><IconCheck size={14} /></span>
                  <IconFile size={18} />
                  <div>
                    <div className="row-main">{f.label}</div>
                    <div className="row-sub" style={{ margin: 0, textAlign: "left" }}>{miss ? "missing — upload it to continue" : f.sub}</div>
                  </div>
                  {!miss && on && <span className="row-sub">parsed</span>}
                </div>
              );
            })}
            {ties.slice(0, Math.max(0, revealed - FILES.length)).map((t) => (
              <div className="tie-row" key={t.label}>
                <span className="tick on"><IconCheck size={14} /></span>
                <div>
                  <div className="row-main">{t.label}</div>
                  <div className="row-sub" style={{ margin: 0, textAlign: "left" }}>expected {t.expected.toLocaleString()} · documents {t.actual.toLocaleString()}</div>
                </div>
                <span className="badge ok">Ties</span>
              </div>
            ))}
            {!reading && (
              <div className="summary-strip">
                <div className="stat-trio" style={{ flex: 1 }}>
                  <div className="stat"><div className="v">{booked}</div><div className="k">entries drafted</div></div>
                  <div className="stat"><div className="v">{checked}</div><div className="k">checked, left alone</div></div>
                  <div className="stat"><div className="v">{flags}</div><div className="k">decisions for you</div></div>
                </div>
              </div>
            )}
            {!reading && (
              <div className="summary-strip">
                <Link href="/entries" className="btn-primary">Continue to entries <IconArrowR size={16} /></Link>
                <button
                  className="btn-ghost small"
                  onClick={() => { if (window.confirm("Reset this session? The packet, answers, edits, and audit log will be cleared.")) resetSession(); }}
                >
                  <IconReset size={14} /> Reset session
                </button>
              </div>
            )}
          </div>
          {notice && <div className="alert error">{notice}</div>}
        </>
      )}
    </div>
  );
}
