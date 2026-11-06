// Client-side JE import CSV. Booked entries only; totals always balance
// because every booked line is emitted with its exact stored amount.

import { ajeDisplayNo } from "../trace";
import type { Computed } from "../types";

export const JE_CSV_HEADERS = [
  "Journal Entry #",
  "Date",
  "Account Number",
  "Account Name",
  "Debit",
  "Credit",
  "Line Memo",
  "Reversal Date",
];

const ENTRY_DATE = "09/30/2026";

export function reversalDisplay(reverseOn?: string): string {
  if (!reverseOn) return "";
  const [y, m, d] = reverseOn.split("-");
  return y && m && d ? `${m}/${d}/${y}` : reverseOn;
}

function esc(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildJeCsv(computed: Computed, names: Map<number, string>): string {
  const lines: string[] = [JE_CSV_HEADERS.map(esc).join(",")];
  for (const a of computed.proposal.ajes) {
    if (a.status !== "booked") continue;
    for (const l of a.lines) {
      lines.push(
        [
          ajeDisplayNo(a.id),
          ENTRY_DATE,
          l.acct,
          names.get(l.acct) ?? "",
          l.debit.toFixed(2),
          l.credit.toFixed(2),
          l.source,
          reversalDisplay(a.reverseOn),
        ].map(esc).join(",")
      );
    }
  }
  return lines.join("\n") + "\n";
}
