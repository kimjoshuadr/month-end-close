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

// Signed delta chips: U+2212 minus for drops, + for gains, plain zero.
export function fmtDelta(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < -0.004) return `−${s}`;
  if (n > 0.004) return `+${s}`;
  return "0.00";
}

// Words for aria-live announcements, e.g. "down 5,000.00".
export function deltaWords(n: number): string {
  const s = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < -0.004) return `down ${s}`;
  if (n > 0.004) return `up ${s}`;
  return "unchanged";
}

// ISO 2026-10-01 -> 10/01/2026 for the auto-reverse badge.
export function fmtReverseDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${m}/${d}/${y}` : iso;
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
