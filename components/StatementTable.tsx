"use client";

import type { BsTable, CfTable, IsTable } from "../lib/types";
import { fmtWhole } from "./format";

type Table = IsTable | BsTable | CfTable;

function cell(v: number, header: string, money: boolean): { text: string; pct: boolean } {
  if (header.startsWith("%")) return { text: `${v.toFixed(1)}%`, pct: true };
  if (!money) return { text: fmtWhole(v), pct: false };
  return { text: `$ ${fmtWhole(v)}`, pct: false };
}

// August-PDF-style statement table: centered header, % of Revenue columns
// (hidden under 600px via .pctcol), whole dollars, $ on subtotal/total rows.
export function StatementTable({ title, period, table, footnote }: { title: string; period: string; table: Table; footnote?: string }) {
  return (
    <div className="stmt">
      <div className="stmt-head">
        <p className="eyebrow">Greenline Landscape Co., LLC</p>
        <h2>{title}</h2>
        <p className="muted small">{period}</p>
      </div>
      <div className="tablewrap" style={{ border: "none" }}>
        <table className="data stmt-table">
          <thead>
            <tr>
              <th style={{ background: "#fff", color: "var(--navy)" }}></th>
              {table.headers.map((h, i) => (
                <th key={i} className={`num${h.startsWith("%") ? " pctcol" : ""}`} style={{ background: "#fff", color: "var(--navy)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => {
              if (r.kind === "header") return <tr key={i} className="headerrow"><td colSpan={table.headers.length + 1}>{r.label}</td></tr>;
              const moneyRow = r.kind === "subtotal" || r.kind === "total";
              return (
                <tr key={i} className={r.kind === "line" ? undefined : r.kind}>
                  <td>{r.label}</td>
                  {r.values.map((v, j) => {
                    const c = cell(v, table.headers[j], j === 0 && moneyRow);
                    return <td key={j} className={`num${c.pct ? " pctcol" : ""}`}>{c.text}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 12, fontStyle: "italic" }}>{footnote ?? "Fictional example created for a hiring exercise. Amounts rounded to whole dollars."}</p>
    </div>
  );
}
