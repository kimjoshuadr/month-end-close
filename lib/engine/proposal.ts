import { AUG } from "../reference/august";
import type { Answers, Aje, Checked, Flag, Packet, Proposal, Tie } from "../types";

const r2 = (n: number) => Math.round(n * 100) / 100;

// Debit-normal balance of a TB account (debit minus credit).
export function tbBalance(p: Packet, no: number): number {
  const row = p.tb.find((r) => r.no === no);
  return row ? r2(row.debit - row.credit) : 0;
}

function eachDay(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const d = new Date(startISO + "T12:00:00Z");
  const end = new Date(endISO + "T12:00:00Z");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

const isWeekday = (iso: string) => {
  const w = new Date(iso + "T12:00:00Z").getUTCDay();
  return w >= 1 && w <= 5;
};

// Working days of a pay period (Mon-Fri), and how many fall in a month.
export function splitPeriod(startISO: string, endISO: string, monthPrefix: string): { days: number; inMonth: number } {
  const days = eachDay(startISO, endISO).filter(isWeekday);
  return { days: days.length, inMonth: days.filter((d) => d.startsWith(monthPrefix)).length };
}

function bankSum(p: Packet, re: RegExp): number {
  return r2(p.bank.lines.filter((l) => re.test(l.description)).reduce((s, l) => s + l.withdrawal, 0));
}

function invoiceFor(re: RegExp, p: Packet) {
  return p.invoices.find((i) => re.test(`${i.vendor} ${i.number}`));
}

// Invoice account mapping by vendor/description keywords.
function invoiceAcct(vendor: string, lines: string): number | null {
  const t = `${vendor} ${lines}`.toLowerCase();
  if (/green valley|mulch|stone|paver|sod/.test(t)) return 5000;
  if (/summit|fuel|diesel|unleaded/.test(t)) return 6120;
  if (/lakeside|electric/.test(t)) return 6110;
  if (/northline|rental|skid/.test(t)) return 6100;
  return null;
}

const inSept2026 = (d: string) => /^(09)\//.test(d) && d.endsWith("2026");

function periodOutsideSept(periodNote?: string, date?: string): boolean {
  if (date && !inSept2026(date)) return true;
  if (periodNote && /10\/\d+\/2026\s*-\s*10\/\d+\/2026/.test(periodNote)) return true;
  return false;
}

// Packet + answers -> AJEs, flags, checked-items, tie-outs.
export function buildProposal(p: Packet, answers: Answers): Proposal {
  const ajes: Aje[] = [];
  const opt = (id: string) => answers[id]?.option;

  const sepRow = p.prepaid.rows.find((r) => r.month.startsWith("Sep"));
  if (sepRow && sepRow.recorded !== "Yes") {
    ajes.push({
      id: "prepaid", title: "Prepaid insurance amortization", status: "booked", assumed: false,
      lines: [
        { acct: 6160, debit: sepRow.amort, credit: 0, source: `Prepaid schedule Sep 2026 row (Recorded: ${sepRow.recorded})` },
        { acct: 1300, debit: 0, credit: sepRow.amort, source: `Prepaid schedule Sep 2026 row (Recorded: ${sepRow.recorded})` },
      ],
    });
  }

  ajes.push({
    id: "depreciation", title: "September depreciation", status: "booked", assumed: false,
    lines: [
      { acct: 6170, debit: p.assets.monthlyDep, credit: 0, source: "Fixed asset schedule monthly total" },
      { acct: 1510, debit: 0, credit: p.assets.monthlyDep, source: "Fixed asset schedule monthly total" },
    ],
  });

  const np = p.payroll.nextPeriod;
  const split = splitPeriod(np.start, np.end, np.start.slice(0, 7));
  const wages = r2((p.payroll.grossPerPeriod * split.inMonth) / split.days);
  const taxes = r2(wages * p.payroll.taxRate);
  ajes.push({
    id: "payroll-accrual", title: `Accrued payroll Sep ${split.inMonth} of ${split.days} working days`, status: "booked", assumed: false,
    lines: [
      { acct: 6000, debit: wages, credit: 0, source: `Payroll register next period ${np.start} to ${np.end}, paid ${np.payDate}` },
      { acct: 6010, debit: taxes, credit: 0, source: `Payroll register tax rate ${p.payroll.taxRate * 100}%` },
      { acct: 2200, debit: 0, credit: r2(wages + taxes), source: `Payroll register next period ${np.start} to ${np.end}, paid ${np.payDate}` },
    ],
  });

  const lakeside = p.invoices.find((i) => /lakeside|electric/i.test(`${i.vendor} ${i.number}`) && !periodOutsideSept(i.periodNote, i.date));
  if (lakeside) {
    ajes.push({
      id: "electric", title: "Lakeside Electric September bill", status: "booked", assumed: false,
      lines: [
        { acct: 6110, debit: lakeside.total, credit: 0, source: `Lakeside invoice ${lakeside.date}, service ${lakeside.periodNote}` },
        { acct: 2000, debit: 0, credit: lakeside.total, source: `Lakeside invoice ${lakeside.date}, service ${lakeside.periodNote}` },
      ],
    });
  }

  const transfer = p.bank.lines.find((l) => /transfer from/i.test(l.description));
  const transferAmt = transfer ? transfer.deposit : 0;
  const otOpt = opt("owner-transfer") ?? "contribution";
  ajes.push({
    id: "owner-transfer", title: "Owner transfer reclass", status: otOpt === "revenue" ? "not_booked" : "booked",
    assumed: opt("owner-transfer") === undefined && otOpt !== "revenue", flagId: "owner-transfer",
    lines: [
      { acct: 4000, debit: transferAmt, credit: 0, source: `Bank 09/12 transfer + Dana email ${p.email.date}` },
      { acct: otOpt === "loan" ? 2600 : 3100, debit: 0, credit: transferAmt, source: `Bank 09/12 transfer + Dana email ${p.email.date}` },
    ],
  });

  const cutoffOpt = opt("aug-cutoff") ?? "skip";
  const firstLabel = p.payroll.periods[0]?.label ?? "";
  const md = /([A-Za-z]+)\s+(\d+)\s*-\s*([A-Za-z]+)\s+(\d+)/.exec(firstLabel);
  const toISO = (m: string, d: string) => {
    const mi = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" }[m.slice(0, 3)] ?? "01";
    return `2026-${mi}-${d.padStart(2, "0")}`;
  };
  const first = md ? splitPeriod(toISO(md[1], md[2]), toISO(md[3], md[4]), "2026-08") : { days: 10, inMonth: 1 };
  const cutWages = r2((p.payroll.grossPerPeriod * first.inMonth) / first.days);
  const cutTaxes = r2(cutWages * p.payroll.taxRate);
  ajes.push({
    id: "aug-cutoff", title: "August payroll cutoff correction", status: cutoffOpt === "correct" ? "booked" : "not_booked",
    assumed: false, flagId: "aug-cutoff",
    lines: [
      { acct: 3900, debit: r2(cutWages + cutTaxes), credit: 0, source: "Period 1 Aug 29-Sep 11 includes Aug 31 (prior period)" },
      { acct: 6000, debit: 0, credit: cutWages, source: "Period 1 Aug 29-Sep 11 includes Aug 31 (prior period)" },
      { acct: 6010, debit: 0, credit: cutTaxes, source: "Period 1 Aug 29-Sep 11 includes Aug 31 (prior period)" },
    ],
  });

  const northOpt = opt("northline") ?? "skip";
  const north = invoiceFor(/northline|NL-3308/i, p);
  ajes.push({
    id: "northline", title: "Northline October rental", status: northOpt === "accrue" ? "booked" : "not_booked",
    assumed: false, flagId: "northline",
    lines: [
      { acct: 6100, debit: north?.total ?? 0, credit: 0, source: `${north?.number ?? ""} rental ${north?.periodNote ?? ""} (mapped to 6100 Rent, closest TB account)` },
      { acct: 2000, debit: 0, credit: north?.total ?? 0, source: `${north?.number ?? ""} rental ${north?.periodNote ?? ""} (mapped to 6100 Rent, closest TB account)` },
    ],
  });

  const checked: Checked[] = [];
  for (const inv of p.invoices) {
    const acct = invoiceAcct(inv.vendor, inv.lines.map((l) => l.desc).join(" "));
    if (periodOutsideSept(inv.periodNote, inv.date)) {
      checked.push({ title: `${inv.vendor} ${inv.number} ($${inv.total.toLocaleString()})`, reason: `Out of period: dated ${inv.date}, ${inv.periodNote ?? "no service period"}; October expense, not September` });
      continue;
    }
    if (acct === null) continue;
    const key = acct === 5000 ? /stone|mulch/i : acct === 6120 ? /fuel/i : /nothing-matches-zzz/i;
    const related = bankSum(p, key);
    const tb = tbBalance(p, acct);
    const name = p.tb.find((r) => r.no === acct)?.name ?? String(acct);
    if (Math.abs(tb - (related + inv.total)) < 0.005) {
      checked.push({ title: `${inv.vendor} ${inv.number} ($${inv.total.toLocaleString()})`, reason: `Already recorded in ${name}: TB $${tb.toLocaleString()} = bank $${related.toLocaleString()} + invoice $${inv.total.toLocaleString()}` });
    }
  }

  const apTB = r2(-tbBalance(p, 2000));
  const traceable = r2(checked.filter((c) => /already recorded/i.test(c.reason)).reduce((s, c) => s + Number(/\$([\d,]+)/.exec(c.title)?.[1].replace(/,/g, "") ?? 0), 0));
  const flags: Flag[] = [
    { id: "owner-transfer", title: "$5,000 transfer from ****4471 on 9/12", evidence: `Bank deposit $${transferAmt.toLocaleString()} plus Dana email: personal funds covering payroll. Most likely credited to revenue; 3100 has no balance.`, kind: "decision", options: [{ id: "contribution", label: "Capital contribution (default)" }, { id: "loan", label: "Loan from owner (new acct 2600 — not in trial balance, requires approval)" }, { id: "revenue", label: "Already correct as revenue" }], defaultOption: "contribution" },
    { id: "ap-support", title: "Accounts payable support", evidence: `TB AP $${apTB.toLocaleString()}; traceable invoices $${traceable.toLocaleString()}; remaining $${r2(apTB - traceable).toLocaleString()} unsupported. Request AP subledger.`, kind: "info", options: [{ id: "ack", label: "Acknowledge" }], defaultOption: "ack" },
    { id: "aug-cutoff", title: "August payroll cutoff (Aug 31 in Period 1)", evidence: `Period 1 includes Aug 31: $${cutWages.toLocaleString()} wages + $${cutTaxes} taxes expensed in September; August already issued. Default: not booked (immaterial prior period).`, kind: "decision", options: [{ id: "skip", label: "Leave as is (default)" }, { id: "correct", label: "Correct via retained earnings" }], defaultOption: "skip" },
    { id: "payroll-method", title: "Accrual method assumption", evidence: `Accrual uses ${split.inMonth}/${split.days} of gross per period (Mon-Fri from period start; holidays ignored).`, kind: "info", options: [{ id: "ack", label: "Acknowledge" }], defaultOption: "ack" },
    { id: "revenue-class", title: "Revenue classification", evidence: "Customer deposits cannot be mapped to Landscape vs Maintenance from the bank; TB split assumed correct. Oakmont HOA pair (12,400 + 9,800) may include prepayments.", kind: "info", options: [{ id: "ack", label: "Acknowledge" }], defaultOption: "ack" },
    { id: "distributions", title: "Owner distributions in September", evidence: "No distributions appear in the bank; cash flow assumes zero (August had 20,000).", kind: "info", options: [{ id: "ack", label: "Acknowledge" }], defaultOption: "ack" },
    { id: "northline", title: "Northline rental (October)", evidence: `Invoice ${north?.number ?? ""} dated ${north?.date ?? ""}, rental ${north?.periodNote ?? ""}: October expense. Accrue only if directed.`, kind: "decision", options: [{ id: "skip", label: "Leave in October (default)" }, { id: "accrue", label: "Accrue in September" }], defaultOption: "skip" },
  ];

  const gusto = bankSum(p, /gusto/i);
  const expCost = r2(p.payroll.grossPerPeriod * (1 + p.payroll.taxRate));
  const ties: Tie[] = [
    { label: "bank-cash", expected: tbBalance(p, 1000), actual: p.bank.end, ok: tbBalance(p, 1000) === p.bank.end },
    { label: "payroll-bank", expected: r2(2 * expCost), actual: gusto, ok: gusto === r2(2 * expCost) },
    { label: "materials", expected: tbBalance(p, 5000), actual: r2(bankSum(p, /stone|mulch/i) + (invoiceFor(/GV-20931/i, p)?.total ?? 0)), ok: false },
    { label: "fuel", expected: tbBalance(p, 6120), actual: r2(bankSum(p, /fuel/i) + (invoiceFor(/SF-77412/i, p)?.total ?? 0)), ok: false },
    { label: "loan-principal", expected: r2(AUG.bs.loan + tbBalance(p, 2500)), actual: r2(bankSum(p, /loan payment/i) - tbBalance(p, 6180)), ok: false },
  ];
  for (const t of ties) if (t.label !== "bank-cash" && t.label !== "payroll-bank") t.ok = Math.abs(t.expected - t.actual) < 0.005;

  return { ajes, flags, checked, ties };
}
