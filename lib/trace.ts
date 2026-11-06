import { TB_TO_LINE } from "./engine/statements";
import type { BankLine, Computed, Invoice, Packet } from "./types";

export type TraceKey =
  | { kind: "entry"; ajeId: string }
  | { kind: "aje-line"; ajeId: string; line: number }
  | { kind: "statement"; table: "isMonth" | "isYtd" | "bs" | "cf"; label: string }
  | { kind: "tie"; label: string };

export type TraceBadge = { text: string; tone: "booked" | "assumed" | "notbooked" | "info" };
export type TraceResult = {
  title: string;
  badges: TraceBadge[];
  rule: string;
  lines: { label: string; value: string }[];
  sources: { label: string; excerpt: string }[];
  flag?: { title: string; evidence: string };
};

const r2money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function bankExcerpt(l: BankLine): string {
  const amt = l.deposit > 0 ? `+$${r2money(l.deposit)}` : `-$${r2money(l.withdrawal)}`;
  return `${l.date.slice(5)} · ${l.description} · ${amt} · bal $${r2money(l.balance)}`;
}

function invoiceExcerpt(i: Invoice): string {
  const bits = [`${i.vendor}`, `${i.number}`, `dated ${i.date}`, `total $${r2money(i.total)}`];
  if (i.periodNote) bits.push(i.periodNote);
  if (i.due) bits.push(`due ${i.due}`);
  return bits.join(" · ");
}

// Plain-language rule behind each automatic entry.
const RULES: Record<string, string> = {
  prepaid: "The prepaid schedule amortizes $1,800 a month. Its September row says not yet recorded, so the full month posts now.",
  depreciation: "Straight-line depreciation for September is the schedule total: $1,300 trucks + $600 mowers + $500 trailers.",
  "payroll-accrual": "Pay is earned over 10 working days a period. 3 of the Sep 26–Oct 9 days fall in September, so 3/10 of $9,250 wages plus 10% payroll taxes accrues.",
  electric: "The Lakeside bill covers September service and was never sent to accounting, while the TB utilities line already equals the city bill paid from the bank — so Lakeside is additional.",
  "owner-transfer": "A $5,000 bank transfer plus Dana's email saying it was personal money covering payroll. 3100 has no balance, so the default books it as a capital contribution out of revenue.",
  "aug-cutoff": "Period 1 (Aug 29–Sep 11) includes Aug 31 — one working day, $925 wages + $92.50 taxes — expensed in September although August already issued. Left out by default as immaterial.",
  northline: "Invoice NL-3308 rents equipment for October, dated in October. September accrues it only if the accountant chooses.",
};

function ajeSources(p: Packet, ajeId: string): { label: string; excerpt: string }[] {
  const out: { label: string; excerpt: string }[] = [];
  if (ajeId === "prepaid") {
    const row = p.prepaid.rows.find((r) => r.month.startsWith("Sep"));
    if (row) out.push({ label: "Prepaid schedule", excerpt: `Sep 2026 · amort $${r2money(row.amort)} · recorded: ${row.recorded} · asset 1300 / expense 6160` });
  }
  if (ajeId === "depreciation") {
    out.push({ label: "Fixed asset schedule", excerpt: `Straight-line, 60 months · monthly $1,300 + $600 + $500 = $2,400 · GL 1500 / 1510 / 6170` });
  }
  if (ajeId === "payroll-accrual") {
    const np = p.payroll.nextPeriod;
    out.push({ label: "Payroll register", excerpt: `Next period ${np.start} to ${np.end}, paid ${np.payDate} · $${r2money(p.payroll.grossPerPeriod)} per period · taxes ${p.payroll.taxRate * 100}%` });
  }
  if (ajeId === "electric") {
    const inv = p.invoices.find((i) => /lakeside/i.test(i.vendor));
    if (inv) out.push({ label: "Lakeside invoice", excerpt: invoiceExcerpt(inv) });
    const city = p.bank.lines.find((l) => /city water/i.test(l.description));
    if (city) out.push({ label: "Bank (already in TB)", excerpt: bankExcerpt(city) });
  }
  if (ajeId === "owner-transfer") {
    const t = p.bank.lines.find((l) => /transfer from/i.test(l.description));
    if (t) out.push({ label: "Bank transfer", excerpt: bankExcerpt(t) });
    out.push({ label: "Dana email", excerpt: `${p.email.from} · ${p.email.date} · "${p.email.body.split("\n").find((l) => /\$5k|personal/i.test(l))?.trim() ?? p.email.body.slice(0, 120)}"` });
  }
  if (ajeId === "aug-cutoff") {
    out.push({ label: "Payroll register", excerpt: `Period 1: ${p.payroll.periods[0]?.label ?? "Aug 29 - Sep 11"} · Aug 31 is 1 of 10 working days · $${r2money(p.payroll.grossPerPeriod)} per period` });
  }
  if (ajeId === "northline") {
    const inv = p.invoices.find((i) => /northline/i.test(i.vendor));
    if (inv) out.push({ label: "Northline invoice", excerpt: invoiceExcerpt(inv) });
  }
  return out;
}

// IS subtotal rows -> the TB accounts that compose them.
const BS_ACCTS: Record<string, number[]> = {
  Cash: [1000], "Accounts Receivable": [1200], "Prepaid Insurance": [1300],
  "Total Current Assets": [1000, 1200, 1300], "Fixed Assets, Net of Accumulated Depreciation": [1500, 1510],
  "TOTAL ASSETS": [1000, 1200, 1300, 1500, 1510], "Accounts Payable": [2000], "Accrued Payroll": [2200],
  "Total Current Liabilities": [2000, 2200], "Equipment Loan": [2500], "Owner Loan": [2600],
  "Total Long-Term Liabilities": [2500, 2600], "TOTAL LIABILITIES": [2000, 2200, 2500, 2600],
  "Owner's Capital": [3000], "Owner Contributions": [3100], "Retained Earnings": [3900],
  "September Net Income": [], "TOTAL EQUITY": [3000, 3100, 3900], "TOTAL LIABILITIES & EQUITY": [2000, 2200, 2500, 2600, 3000, 3100, 3900],
};

const OPEX_LABELS = ["Wages", "Materials", "Subcontractors", "Rent", "Fuel", "Utilities", "Repairs & Maintenance", "Payroll Taxes", "Insurance", "Software & Subscriptions", "Professional Fees", "Bank Fees"];

function acctsForStatement(table: TraceKey & { kind: "statement" }): number[] {
  const { label } = table;
  if (table.table === "bs") return BS_ACCTS[label] ?? [];
  if (table.table === "cf") {
    if (/receivable/i.test(label)) return [1200];
    if (/prepaid/i.test(label)) return [1300];
    if (/accounts payable/i.test(label)) return [2000];
    if (/accrued payroll/i.test(label)) return [2200];
    if (/depreciation/i.test(label)) return [6170, 1510];
    if (/equipment loan|repayments/i.test(label)) return [2500];
    if (/contribution/i.test(label)) return [4000, 3100];
    if (/loan proceeds/i.test(label)) return [4000, 2600];
    if (/distribution/i.test(label)) return [];
    if (/net income/i.test(label)) return [4000, 4100, 5000, 5100, 6000, 6010, 6100, 6110, 6120, 6130, 6140, 6150, 6160, 6170, 6180, 6190];
    return [];
  }
  if (/total sales/i.test(label)) return [4000, 4100];
  if (/total operating expenses/i.test(label)) return acctNos(OPEX_LABELS);
  if (/net operating income/i.test(label)) return [4000, 4100, ...acctNos(OPEX_LABELS)];
  if (/total other/i.test(label)) return [6170, 6180];
  if (/net income/i.test(label)) return [4000, 4100, ...acctNos(OPEX_LABELS), 6170, 6180];
  const entry = Object.entries(TB_TO_LINE).find(([, line]) => line === label);
  return entry ? [Number(entry[0])] : [];
}

function acctNos(labels: string[]): number[] {
  return Object.entries(TB_TO_LINE).filter(([, line]) => labels.includes(line)).map(([no]) => Number(no));
}

function acctName(p: Packet, no: number): string {
  return p.tb.find((r) => r.no === no)?.name ?? (no === 2600 ? "Owner Loan" : `Account ${no}`);
}

// Trace any computed figure back to entries, sources, rule, and flag.
export function traceFor(packet: Packet, computed: Computed, key: TraceKey): TraceResult | null {
  if (key.kind === "entry" || key.kind === "aje-line") {
    const aje = computed.proposal.ajes.find((a) => a.id === key.ajeId);
    if (!aje) return null;
    const flag = aje.flagId ? computed.proposal.flags.find((f) => f.id === aje.flagId) : undefined;
    const focus = key.kind === "aje-line" ? aje.lines[key.line] : undefined;
    if (key.kind === "aje-line" && !focus) return null;
    return {
      title: aje.title,
      badges: [
        { text: aje.status === "booked" ? "Booked" : "Not booked", tone: aje.status === "booked" ? "booked" : "notbooked" },
        ...(aje.assumed ? [{ text: "Assumed, unconfirmed", tone: "assumed" as const }] : []),
      ],
      rule: RULES[aje.id] ?? "Built from the packet by deterministic rules.",
      lines: (focus ? [focus] : aje.lines).map((l) => ({
        label: `${l.acct} ${acctName(packet, l.acct)}`,
        value: l.debit > 0 ? `Dr $${r2money(l.debit)}` : `Cr $${r2money(l.credit)}`,
      })),
      sources: ajeSources(packet, aje.id),
      flag: flag ? { title: flag.title, evidence: flag.evidence } : undefined,
    };
  }
  if (key.kind === "tie") {
    const tie = computed.proposal.ties.find((t) => t.label === key.label);
    if (!tie) return null;
    return {
      title: `Tie-out: ${tie.label}`,
      badges: [{ text: tie.ok ? "Ties" : "Off", tone: tie.ok ? "booked" : "notbooked" }],
      rule: "Expected comes from the trial balance; actual is rebuilt independently from bank and invoice documents.",
      lines: [
        { label: "Expected (trial balance)", value: `$${r2money(tie.expected)}` },
        { label: "Actual (documents)", value: `$${r2money(tie.actual)}` },
      ],
      sources: tieSources(packet, tie.label),
    };
  }
  const table = computed.statements[key.table];
  const row = table.rows.find((r) => r.label === key.label);
  if (!row) return null;
  const accts = acctsForStatement(key);
  const ajes = computed.proposal.ajes.filter((a) => a.lines.some((l) => accts.includes(l.acct)));
  const col = key.table === "cf" ? 0 : 0;
  return {
    title: `${key.label} — ${col === 0 ? "current period" : "comparative"}`,
    badges: [{ text: "Statement figure", tone: "info" }],
    rule: accts.length
      ? `Adjusted trial-balance accounts ${accts.join(", ")} flow into this row; booked entries above changed them from the unadjusted TB.`
      : "Computed from balance changes since August plus booked entries (see cash-flow walk).",
    lines: [
      { label: "Displayed", value: `$${r2money(row.values[0])}` },
      ...ajes.flatMap((a) =>
        a.lines.filter((l) => accts.includes(l.acct)).map((l) => ({
          label: `${a.title} · ${l.acct} ${acctName(packet, l.acct)}`,
          value: l.debit > 0 ? `Dr $${r2money(l.debit)}` : `Cr $${r2money(l.credit)}`,
        }))
      ),
    ],
    sources: [...new Set(ajes.map((a) => a.id))].flatMap((id) => ajeSources(packet, id)).slice(0, 6),
  };
}

function tieSources(packet: Packet, label: string): { label: string; excerpt: string }[] {
  const inv = (re: RegExp) => packet.invoices.find((i) => re.test(`${i.vendor} ${i.number}`));
  const bank = (re: RegExp) => packet.bank.lines.filter((l) => re.test(l.description));
  switch (label) {
    case "bank-cash":
      return [{ label: "Bank statement", excerpt: `Ending balance $${r2money(packet.bank.end)} across ${packet.bank.lines.length} activity lines` }];
    case "payroll-bank":
      return bank(/gusto/i).map((l) => ({ label: "Gusto payment", excerpt: bankExcerpt(l) }));
    case "materials": {
      const g = inv(/GV-20931/);
      return [...bank(/stone|mulch/i).map((l) => ({ label: "Bank purchase", excerpt: bankExcerpt(l) })), ...(g ? [{ label: "Green Valley invoice", excerpt: invoiceExcerpt(g) }] : [])];
    }
    case "fuel": {
      const s = inv(/SF-77412/);
      return [...bank(/fuel/i).map((l) => ({ label: "Fuel card payment", excerpt: bankExcerpt(l) })), ...(s ? [{ label: "Summit invoice", excerpt: invoiceExcerpt(s) }] : [])];
    }
    case "loan-principal": {
      const pay = bank(/loan payment/i)[0];
      return [...(pay ? [{ label: "Bank loan payment", excerpt: bankExcerpt(pay) }] : []), { label: "TB interest", excerpt: "6180 Interest Expense = September interest portion" }];
    }
    default:
      return [];
  }
}
