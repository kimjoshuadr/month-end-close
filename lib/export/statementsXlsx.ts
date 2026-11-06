// Client-side Excel export. One sheet per statement plus Cover and Flux
// Review. Money cells are numbers rounded exactly like the screen
// (whole dollars, matching fmtWhole), never strings.

import * as XLSX from "xlsx";
import type { FluxLine } from "../engine/flux";
import type { Computed, Signoff } from "../types";

export const CLOSE_SHEETS = ["Cover", "IS Month", "IS YTD", "Balance Sheet", "Cash Flows", "TTM", "Flux Review"] as const;

type Aoa = (string | number)[];

function tableSheet(headers: string[], rows: { label: string; values: number[] }[]): Aoa[] {
  const out: Aoa[] = [["Line", ...headers]];
  for (const r of rows) {
    if (r.values.length === 0) out.push([r.label]);
    else out.push([r.label, ...r.values.map((v) => Math.round(v))]);
  }
  return out;
}

export function buildCloseWorkbook(
  computed: Computed,
  flux: FluxLine[],
  fluxNotes: Record<string, string>,
  signoff: Signoff | null
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const cover: Aoa[] = [
    ["Greenline Landscape Co., LLC"],
    ["Financial Statements", "September 30, 2026"],
    [],
    ["Unadjusted net income", Math.round(computed.netIncomeUnadj)],
    ["Adjusted net income", Math.round(computed.netIncomeAdj)],
    ["Balanced", computed.balanced ? "Yes" : "No"],
    ["Unresolved items", computed.unresolved],
    [],
    ["Prepared by", signoff?.preparedBy ?? ""],
    ["Reviewed by", signoff?.reviewedBy ?? ""],
    ["Signed at", signoff?.at ?? ""],
    ["Names are typed, not authenticated (no login in this demo)."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cover), "Cover");
  const s = computed.statements;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tableSheet(s.isMonth.headers, s.isMonth.rows)), "IS Month");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tableSheet(s.isYtd.headers, s.isYtd.rows)), "IS YTD");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tableSheet(s.bs.headers, s.bs.rows)), "Balance Sheet");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tableSheet(s.cf.headers, s.cf.rows)), "Cash Flows");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tableSheet(s.ttm.headers, s.ttm.rows)), "TTM");
  const fluxAoa: Aoa[] = [["Line", "Sep 2026", "Aug 2026", "Sep 2025", "$ vs Aug", "% vs Aug", "$ vs Sep 25", "% vs Sep 25", "Flagged", "Explanation"]];
  for (const f of flux) {
    fluxAoa.push([
      f.line, Math.round(f.current), Math.round(f.aug), Math.round(f.sep25),
      Math.round(f.dAug), f.pctAug ?? "", Math.round(f.dSep25), f.pctSep25 ?? "",
      f.flagged ? "Yes" : "", fluxNotes[f.line] ?? "",
    ]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fluxAoa), "Flux Review");
  return wb;
}
