import { AUG, type IsFigures, type IsLine } from "../reference/august";
import type { Aje, Overrides, Packet, Statements, TbRow } from "../types";

const r2 = (n: number) => Math.round(n * 100) / 100;

export const TB_TO_LINE: Record<number, IsLine> = {
  4000: "Landscape Services Revenue", 4100: "Maintenance Contract Revenue",
  6000: "Wages", 5000: "Materials", 5100: "Subcontractors", 6100: "Rent",
  6120: "Fuel", 6110: "Utilities", 6130: "Repairs & Maintenance", 6010: "Payroll Taxes",
  6160: "Insurance", 6140: "Software & Subscriptions", 6150: "Professional Fees",
  6190: "Bank Fees", 6170: "Depreciation", 6180: "Interest Expense",
};

const REVENUE_ACCTS = [4000, 4100];

// New amounts keyed `${ajeId}:${lineIndex}`; applied to the non-zero side.
export function applyOverrides(ajes: Aje[], o: Overrides): Aje[] {
  return ajes.map((a) => ({
    ...a,
    lines: a.lines.map((l, i) => {
      const key = `${a.id}:${i}`;
      if (!(key in o)) return { ...l };
      const v = Number(o[key]);
      const amt = Number.isFinite(v) ? v : 0;
      if (l.credit !== 0) return { ...l, credit: amt };
      return { ...l, debit: amt };
    }),
  }));
}

// Apply booked AJEs to the trial balance (no plugs; unbalanced lines stay).
export function adjustedTb(tb: TbRow[], ajes: Aje[]): TbRow[] {
  const adj = tb.map((r) => ({ ...r }));
  for (const a of ajes) {
    if (a.status !== "booked") continue;
    for (const l of a.lines) {
      let row = adj.find((r) => r.no === l.acct);
      if (!row) {
        row = { no: l.acct, name: l.acct === 2600 ? "Owner Loan (new — not in trial balance, requires approval)" : `Account ${l.acct}`, debit: 0, credit: 0 };
        adj.push(row);
      }
      row.debit = r2(row.debit + l.debit);
      row.credit = r2(row.credit + l.credit);
    }
  }
  return adj;
}

function bal(tb: TbRow[], no: number): number {
  const row = tb.find((r) => r.no === no);
  return row ? r2(row.debit - row.credit) : 0;
}

// September activity by income-statement line (revenue credits, expenses debits).
export function septFigures(adj: TbRow[]): IsFigures {
  const f = {} as IsFigures;
  for (const [no, line] of Object.entries(TB_TO_LINE)) {
    const b = bal(adj, Number(no));
    f[line] = REVENUE_ACCTS.includes(Number(no)) ? r2(-b) : r2(b);
  }
  return f;
}

export function netOf(f: IsFigures): number {
  const rev = f["Landscape Services Revenue"] + f["Maintenance Contract Revenue"];
  const exp = (Object.keys(f) as IsLine[]).filter((l) => l !== "Landscape Services Revenue" && l !== "Maintenance Contract Revenue").reduce((s, l) => s + f[l], 0);
  return r2(rev - exp);
}

export function netIncomeOfTb(tb: TbRow[]): number {
  return netOf(septFigures(tb));
}

const OPEX: IsLine[] = ["Wages", "Materials", "Subcontractors", "Rent", "Fuel", "Utilities", "Repairs & Maintenance", "Payroll Taxes", "Insurance", "Software & Subscriptions", "Professional Fees", "Bank Fees"];

function isRows(cur: IsFigures, cmp: IsFigures, rev: (f: IsFigures) => number) {
  const pct = (v: number, r: number) => (r === 0 ? 0 : r2((v / r) * 1000) / 10);
  const rows: Statements["isMonth"]["rows"] = [];
  const row = (label: string, c: number, p: number, kind: "line" | "subtotal" | "total" | "header" = "line") => rows.push({ label, values: [c, pct(c, rev(cur)), p, pct(p, rev(cmp))], kind });
  rows.push({ label: "Sales", values: [], kind: "header" });
  row("Landscape Services Revenue", cur["Landscape Services Revenue"], cmp["Landscape Services Revenue"]);
  row("Maintenance Contract Revenue", cur["Maintenance Contract Revenue"], cmp["Maintenance Contract Revenue"]);
  const sales = (f: IsFigures) => r2(f["Landscape Services Revenue"] + f["Maintenance Contract Revenue"]);
  const opex = (f: IsFigures) => r2(OPEX.reduce((s, l) => s + f[l], 0));
  const other = (f: IsFigures) => r2(f.Depreciation + f["Interest Expense"]);
  rows.push({ label: "Total Sales", values: [sales(cur), 100, sales(cmp), 100], kind: "subtotal" });
  rows.push({ label: "Operating Expenses", values: [], kind: "header" });
  for (const l of OPEX) row(l, cur[l], cmp[l]);
  rows.push({ label: "Total Operating Expenses", values: [opex(cur), pct(opex(cur), sales(cur)), opex(cmp), pct(opex(cmp), sales(cmp))], kind: "subtotal" });
  rows.push({ label: "Net Operating Income", values: [r2(sales(cur) - opex(cur)), pct(r2(sales(cur) - opex(cur)), sales(cur)), r2(sales(cmp) - opex(cmp)), pct(r2(sales(cmp) - opex(cmp)), sales(cmp))], kind: "total" });
  rows.push({ label: "Other Expenses", values: [], kind: "header" });
  row("Depreciation", cur.Depreciation, cmp.Depreciation);
  row("Interest Expense", cur["Interest Expense"], cmp["Interest Expense"]);
  rows.push({ label: "Total Other Expenses", values: [other(cur), pct(other(cur), sales(cur)), other(cmp), pct(other(cmp), sales(cmp))], kind: "subtotal" });
  rows.push({ label: "Net Income/(Loss)", values: [netOf(cur), pct(netOf(cur), sales(cur)), netOf(cmp), pct(netOf(cmp), sales(cmp))], kind: "total" });
  return rows;
}

// Adjusted TB -> the four statements in the August PDF layout.
export function buildStatements(packet: Packet, ajes: Aje[]): Statements {
  const adj = adjustedTb(packet.tb, ajes);
  const sept = septFigures(adj);
  const add = (a: IsFigures, b: IsFigures) => Object.fromEntries((Object.keys(a) as IsLine[]).map((l) => [l, r2(a[l] + b[l])])) as IsFigures;
  const ytd2026 = add(AUG.is.ytd, sept);
  const ytd2025 = add(AUG.is.ytd2025, AUG.sep2025);

  const isMonth = { headers: ["2026", "% of Revenue", "2025", "% of Revenue"], rows: isRows(sept, AUG.sep2025, (f) => r2(f["Landscape Services Revenue"] + f["Maintenance Contract Revenue"])) };
  const isYtd = { headers: ["2026", "% of Revenue", "2025", "% of Revenue"], rows: isRows(ytd2026, ytd2025, (f) => r2(f["Landscape Services Revenue"] + f["Maintenance Contract Revenue"])) };

  const cash = bal(adj, 1000), ar = bal(adj, 1200), prepaid = bal(adj, 1300);
  const fixedNet = r2(bal(adj, 1500) + bal(adj, 1510));
  const ap = r2(-bal(adj, 2000)), acc = r2(-bal(adj, 2200));
  const loan = r2(-bal(adj, 2500)), oloan = adj.some((r) => r.no === 2600) ? r2(-bal(adj, 2600)) : 0;
  const cap = r2(-bal(adj, 3000)), contrib = r2(-bal(adj, 3100)), re = r2(-bal(adj, 3900));
  const ni = netOf(sept);
  const bsRows: Statements["bs"]["rows"] = [
    { label: "ASSETS", values: [], kind: "header" },
    { label: "Cash", values: [cash], kind: "line" },
    { label: "Accounts Receivable", values: [ar], kind: "line" },
    { label: "Prepaid Insurance", values: [prepaid], kind: "line" },
    { label: "Total Current Assets", values: [r2(cash + ar + prepaid)], kind: "subtotal" },
    { label: "Fixed Assets, Net of Accumulated Depreciation", values: [fixedNet], kind: "line" },
    { label: "TOTAL ASSETS", values: [r2(cash + ar + prepaid + fixedNet)], kind: "total" },
    { label: "LIABILITIES", values: [], kind: "header" },
    { label: "Accounts Payable", values: [ap], kind: "line" },
    { label: "Accrued Payroll", values: [acc], kind: "line" },
    { label: "Total Current Liabilities", values: [r2(ap + acc)], kind: "subtotal" },
    { label: "Equipment Loan", values: [loan], kind: "line" },
  ];
  if (oloan !== 0) bsRows.push({ label: "Owner Loan (new — not in trial balance, requires approval)", values: [oloan], kind: "line" });
  const totalLiab = r2(ap + acc + loan + oloan);
  const totalEq = r2(cap + contrib + re + ni);
  bsRows.push(
    { label: "Total Long-Term Liabilities", values: [r2(loan + oloan)], kind: "subtotal" },
    { label: "TOTAL LIABILITIES", values: [totalLiab], kind: "total" },
    { label: "EQUITY", values: [], kind: "header" },
    { label: "Owner's Capital", values: [cap], kind: "line" },
    { label: "Owner Contributions", values: [contrib], kind: "line" },
    { label: "Retained Earnings", values: [re], kind: "line" },
    { label: "September Net Income", values: [ni], kind: "line" },
    { label: "TOTAL EQUITY", values: [totalEq], kind: "total" },
    { label: "TOTAL LIABILITIES & EQUITY", values: [r2(totalLiab + totalEq)], kind: "total" },
  );
  const bs = { headers: ["September 30, 2026"], rows: bsRows };

  const ot = ajes.find((a) => a.id === "owner-transfer" && a.status === "booked");
  const contribIn = ot && ot.lines.some((l) => l.acct === 3100) ? ot.lines.find((l) => l.acct === 3100)!.credit : 0;
  const loanIn = ot && ot.lines.some((l) => l.acct === 2600) ? ot.lines.find((l) => l.acct === 2600)!.credit : 0;
  const depExp = sept.Depreciation;
  const dAR = r2(-(ar - AUG.bs.ar)), dPre = r2(AUG.bs.prepaid - prepaid), dAP = r2(ap - AUG.bs.ap), dAcc = r2(acc - 0);
  const opM = r2(ni + depExp + dAR + dPre + dAP + dAcc);
  const repay = r2(-(AUG.bs.loan - loan));
  const y = AUG.cf.ytd;
  const ytd = {
    ni: r2(y.netIncome + ni), dep: r2(y.depreciation + depExp), ar: r2(y.arChange + dAR),
    pre: r2(y.prepaidChange + dPre), ap: r2(y.apChange + dAP), acc: r2(0 + dAcc),
    repay: r2(y.loanRepay + repay), contrib: r2(0 + contribIn), loanIn: r2(0 + loanIn), dist: y.distributions,
  };
  const opY = r2(ytd.ni + ytd.dep + ytd.ar + ytd.pre + ytd.ap + ytd.acc);
  const finM = r2(repay + contribIn + loanIn), finY = r2(ytd.repay + ytd.contrib + ytd.loanIn + ytd.dist);
  const cf: Statements["cf"] = {
    headers: ["Month", "Year-to-Date"],
    rows: [
      { label: "Cash Flows from Operating Activities", values: [], kind: "header" },
      { label: "Net Income", values: [ni, ytd.ni], kind: "line" },
      { label: "Depreciation", values: [depExp, ytd.dep], kind: "line" },
      { label: "Accounts Receivable", values: [dAR, ytd.ar], kind: "line" },
      { label: "Prepaid Insurance", values: [dPre, ytd.pre], kind: "line" },
      { label: "Accounts Payable", values: [dAP, ytd.ap], kind: "line" },
      { label: "Accrued Payroll", values: [dAcc, ytd.acc], kind: "line" },
      { label: "Net Cash Provided by Operating Activities", values: [opM, opY], kind: "subtotal" },
      { label: "Cash Flows from Investing Activities", values: [], kind: "header" },
      { label: "Net Cash Used in Investing Activities", values: [0, 0], kind: "subtotal" },
      { label: "Cash Flows from Financing Activities", values: [], kind: "header" },
      { label: "Repayments of Equipment Loan", values: [repay, ytd.repay], kind: "line" },
      { label: "Owner Contributions", values: [contribIn, ytd.contrib], kind: "line" },
      ...(loanIn !== 0 || ytd.loanIn !== 0 ? [{ label: "Owner Loan Proceeds", values: [loanIn, ytd.loanIn], kind: "line" as const }] : []),
      { label: "Owner Distributions", values: [0, ytd.dist], kind: "line" },
      { label: "Net Cash Used in Financing Activities", values: [finM, finY], kind: "subtotal" },
      { label: "Net Change in Cash", values: [r2(opM + finM), r2(opY + finY)], kind: "total" },
      { label: "Cash at Beginning of Period", values: [AUG.bs.cash, y.cashBegin], kind: "line" },
      { label: "Cash at End of Period", values: [r2(AUG.bs.cash + opM + finM), r2(y.cashBegin + opY + finY)], kind: "total" },
    ],
  };

  return { isMonth, isYtd, bs, cf };
}
