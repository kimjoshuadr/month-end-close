import * as XLSX from "xlsx";
import type { Packet } from "../types";

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,]/g, "").trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function sheetRows(wb: XLSX.WorkBook, name: string): unknown[][] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`Missing sheet: ${name}`);
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
}

// Trial Balance, Payroll Register, Prepaid Insurance, Fixed Assets sheets.
export function parseWorkbook(buf: ArrayBuffer): Pick<Packet, "tb" | "payroll" | "prepaid" | "assets"> {
  const wb = XLSX.read(buf, { type: "array" });

  const tbRows = sheetRows(wb, "Trial Balance");
  const headerIdx = tbRows.findIndex((r) => String(r[0]).trim() === "Acct #");
  if (headerIdx < 0) throw new Error("Trial Balance header not found");
  const tb: Packet["tb"] = [];
  for (const r of tbRows.slice(headerIdx + 1)) {
    const no = Number(String(r[0]).trim());
    if (!Number.isFinite(no) || String(r[1]).trim().toLowerCase() === "total") break;
    if (!r[1]) continue;
    tb.push({ no, name: String(r[1]).trim(), debit: num(r[2]), credit: num(r[3]) });
  }

  const pr = sheetRows(wb, "Payroll Register");
  const flat = pr.map((r) => r.map(String).join(" ").trim());
  const totalRow = pr.find((r) => String(r[0]).trim() === "Total gross wages");
  if (!totalRow) throw new Error("Payroll totals not found");
  const grossPerPeriod = num(totalRow[2]);
  const taxRow = pr.find((r) => String(r[0]).includes("Employer payroll taxes"));
  const taxRate = taxRow ? Number(/(\d+(?:\.\d+)?)\s*%/.exec(String(taxRow[0]))?.[1] ?? NaN) / 100 : NaN;
  if (!Number.isFinite(taxRate)) throw new Error("Payroll tax rate not found");
  const periodText = flat.join("\n");
  const next = /Next period:\s*([A-Za-z]+\s+\d+)\s*-\s*([A-Za-z]+\s+\d+),\s*to be paid\s*(\d+\/\d+\/\d+)/.exec(periodText);
  if (!next) throw new Error("Next payroll period not found");
  const toISO = (s: string) => {
    const [m, d] = s.split(/\s+/);
    const mi = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" }[m.slice(0, 3)] ?? "01";
    const year = m.startsWith("Jan") && next[1].includes("Sep") ? "2027" : "2026";
    return `${year}-${mi}-${d.padStart(2, "0")}`;
  };
  const payISO = (() => {
    const [m, d, y] = next[3].split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  })();
  const gross = grossPerPeriod;
  const payroll: Packet["payroll"] = {
    periods: [
      { label: "Aug 29 - Sep 11", gross, taxes: gross * taxRate },
      { label: "Sep 12 - Sep 25", gross, taxes: gross * taxRate },
    ],
    nextPeriod: { start: toISO(next[1].replace(/\s+/, " ")), end: toISO(next[2].replace(/\s+/, " ")), payDate: payISO },
    taxRate,
    grossPerPeriod: gross,
  };

  const pp = sheetRows(wb, "Prepaid Insurance");
  const amortRow = pp.find((r) => String(r[0]).trim() === "Monthly amortization");
  const monthlyAmort = amortRow ? num(amortRow[1]) : NaN;
  if (!Number.isFinite(monthlyAmort)) throw new Error("Prepaid amortization not found");
  const mIdx = pp.findIndex((r) => String(r[0]).trim() === "Month");
  const rows = pp.slice(mIdx + 1).filter((r) => r[0]).map((r) => ({
    month: String(r[0]).trim(),
    amort: num(r[2]),
    recorded: String(r[4]).trim(),
  }));

  const fa = sheetRows(wb, "Fixed Assets");
  const faTotal = fa.find((r) => String(r[0]).trim() === "Total");
  const monthlyDep = faTotal ? num(faTotal[4]) : NaN;
  if (!Number.isFinite(monthlyDep)) throw new Error("Fixed asset depreciation not found");

  return {
    tb,
    payroll,
    prepaid: { monthlyAmort, rows, assetAcct: 1300, expenseAcct: 6160 },
    assets: { monthlyDep, assetAcct: 1500, accumAcct: 1510, expenseAcct: 6170 },
  };
}
