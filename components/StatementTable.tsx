"use client";

import type { BsTable, CfTable, IsTable } from "../lib/types";
import { fmtWhole } from "./format";
import { useUI } from "./studio";

type Table = IsTable | BsTable | CfTable;

function cell(v: number, header: string, money: boolean): { text: string; pct: boolean } {
  if (header.startsWith("%")) return { text: `${v.toFixed(1)}%`, pct: true };
  if (!money) return { text: fmtWhole(v), pct: false };
  return { text: `$ ${fmtWhole(v)}`, pct: false };
}

// Paper statement table: every figure is a button that opens its trace.
export function StatementTable({ tableId, table }: { tableId: "isMonth" | "isYtd" | "bs" | "cf"; table: Table }) {
  const { openTrace } = useUI();
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data">
        <thead>
          <tr>
            <th></th>
            {table.headers.map((h, i) => (
              <th key={i} className={`num${h.startsWith("%") ? " pctcol" : ""}`}>{h}</th>
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
                      <button
                        className="cellbtn"
                        onClick={() => openTrace({ kind: "statement", table: tableId, label: r.label })}
                        aria-label={`Trace ${r.label}: ${c.text}`}
                        title="Trace this number"
                      >
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
