"use client";

import type { BsTable, CfTable, IsTable } from "../lib/types";
import { fmtWhole } from "./format";
import { useDrill } from "./erp-ui";

type Table = IsTable | BsTable | CfTable;

function cell(v: number, header: string, money: boolean): { text: string; pct: boolean } {
  if (header.startsWith("%")) return { text: `${v.toFixed(1)}%`, pct: true };
  if (!money) return { text: fmtWhole(v), pct: false };
  return { text: `$ ${fmtWhole(v)}`, pct: false };
}

// August-format report table; every figure drills down.
export function ReportTable({ tableId, table }: { tableId: "isMonth" | "isYtd" | "bs" | "cf" | "ttm"; table: Table }) {
  const { open } = useDrill();
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="report">
        <thead>
          <tr>
            <th scope="col"><span className="sr">Line</span></th>
            {table.headers.map((h, i) => (
              <th key={i} scope="col" className={`num${h.startsWith("%") ? " pctcol" : ""}`}>{h}</th>
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
                  return (
                    <td key={j} className={`num${c.pct ? " pctcol" : ""}`}>
                      <button className="cellbtn" onClick={() => open({ kind: "statement", table: tableId, label: r.label })} aria-label={`Drill into ${r.label}: ${c.text}`} title="Drill down">
                        {c.text}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
