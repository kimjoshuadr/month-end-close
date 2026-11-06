"use client";

import type { BsTable, CfTable, IsTable } from "../lib/types";
import { fmtMoney } from "./format";

type Table = IsTable | BsTable | CfTable;

function cell(v: number, header: string, money: boolean): string {
  if (header.startsWith("%")) return `${v.toFixed(1)}%`;
  if (!money) return fmtMoney(v);
  return `$ ${fmtMoney(v)}`;
}

// August-PDF-style statement table: centered header, % of Revenue columns,
// parentheses negatives, $ on subtotal/total rows, fictional footnote.
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
                <th key={i} className="num" style={{ background: "#fff", color: "var(--navy)" }}>{h}</th>
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
                  {r.values.map((v, j) => (
                    <td key={j} className="num">{j === 0 && moneyRow ? cell(v, table.headers[j], true) : cell(v, table.headers[j], false)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="small muted" style={{ marginTop: 12, fontStyle: "italic" }}>{footnote ?? "Fictional example created for a hiring exercise."}</p>
    </div>
  );
}
