export function fmtMoney(n: number): string {
  const a = Math.abs(n);
  const s = a.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `(${s})` : s;
}

export function fmtInt(n: number): string {
  const a = Math.abs(Math.round(n));
  const s = a.toLocaleString("en-US");
  return n < 0 ? `(${s})` : s;
}

export function fmtSigned(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-${s}` : s;
}

// Whole dollars for statements, August-PDF style: no cents, parentheses negatives.
export function fmtWhole(n: number): string {
  const r = Math.round(n);
  const s = Math.abs(r).toLocaleString("en-US");
  return r < 0 ? `(${s})` : s;
}

import { ajeDisplayNo } from "../lib/trace";

// Stable ERP-style display numbers; internal ids stay canonical for logic and URLs.
export function ajeNo(id: string): string {
  return ajeDisplayNo(id);
}
