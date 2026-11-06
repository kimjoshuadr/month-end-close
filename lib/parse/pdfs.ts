import { extractText, getDocumentProxy } from "unpdf";
import type { BankLine, Invoice, Packet } from "../types";

function money(s: string): number {
  return Number(s.replace(/[$,]/g, ""));
}

async function pdfPages(buf: ArrayBuffer): Promise<string[]> {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: false });
  return text as string[];
}

function parseBank(text: string): Packet["bank"] {
  const begin = money(/Beginning balance\s*\$?\s*([\d,]+\.\d{2})/.exec(text)?.[1] ?? "");
  const end = money(/Ending balance\s*\$?\s*([\d,]+\.\d{2})/.exec(text)?.[1] ?? "");
  if (!Number.isFinite(begin) || !Number.isFinite(end)) throw new Error("Bank balances not found");
  const lines: BankLine[] = [];
  let prev = begin;
  for (const m of text.matchAll(/(\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})(?=\s*\n|\s*\d{2}\/|\s*$)/g)) {
    const amount = money(m[3]);
    const balance = money(m[4]);
    const isDeposit = balance > prev;
    lines.push({
      date: `2026-${m[1].slice(0, 2)}-${m[1].slice(3)}`,
      description: m[2].trim(),
      withdrawal: isDeposit ? 0 : amount,
      deposit: isDeposit ? amount : amount === 0 ? 0 : 0,
      balance,
    });
    // Deposits carry the amount in deposit; withdrawals in withdrawal.
    const line = lines[lines.length - 1];
    if (isDeposit) {
      line.deposit = amount;
      line.withdrawal = 0;
    } else {
      line.withdrawal = amount;
      line.deposit = 0;
    }
    prev = balance;
  }
  if (lines.length === 0) throw new Error("Bank activity lines not found");
  return { begin, end, lines };
}

function parseInvoices(pages: string[]): Invoice[] {
  const invoices: Invoice[] = [];
  for (const page of pages) {
    if (!/Invoice \/ statement:/.test(page)) continue;
    const vendor = page.split("\n").map((l) => l.trim()).find((l) => l) ?? "";
    const number = /Invoice \/ statement:\s*(.+)/.exec(page)?.[1].trim() ?? "";
    const date = /Date:\s*(\d{2}\/\d{2}\/\d{4})/.exec(page)?.[1] ?? "";
    const due = /Due:\s*(\d{2}\/\d{2}\/\d{4})/.exec(page)?.[1];
    const periodNote = /(Service period[^()\n]*\(.+?\)|Rental period\s+\d+\/\d+\/\d+\s*-\s*\d+\/\d+\/\d+|Fuel card activity\s+\d+\/\d+\/\d+\s*-\s*\d+\/\d+\/\d+)/.exec(page)?.[1];
    const total = money(/Total due\s*([\d,]+\.\d{2})/.exec(page)?.[1] ?? "");
    const lines = [...page.matchAll(/^(.+?)\s+\d+\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/gm)]
      .filter((m) => !/Description|Qty|Unit price/i.test(m[1]))
      .map((m) => ({ desc: m[1].trim(), amount: money(m[3]) }));
    if (!Number.isFinite(total)) throw new Error(`Invoice total not found for ${number}`);
    invoices.push({ vendor, number, date, due, periodNote, total, lines });
  }
  if (invoices.length === 0) throw new Error("No invoices found");
  return invoices;
}

function parseEmail(text: string): Packet["email"] {
  const start = text.search(/\nFrom:\s/);
  const chunk = start >= 0 ? text.slice(start) : text;
  const from = /From:\s*(.+)/.exec(chunk)?.[1].trim() ?? "";
  const date = /Date:\s*(.+)/.exec(chunk)?.[1].trim() ?? "";
  const bodyIdx = text.search(/\nHi team,\n/);
  const body = bodyIdx >= 0 ? text.slice(bodyIdx).replace(/\n?Greenline Landscape Co\., LLC\nFictional email.*$/s, "").trim() : "";
  if (!from || !body) throw new Error("Client email not found");
  return { from, date, body };
}

// Text-extract the bank statement, invoices, and client email.
export async function parseSupportingPdf(buf: ArrayBuffer): Promise<Pick<Packet, "bank" | "invoices" | "email">> {
  const pages = await pdfPages(buf);
  const text = pages.join("\n");
  return { bank: parseBank(text), invoices: parseInvoices(pages), email: parseEmail(text) };
}

export function classifyFile(name: string, firstText: string): "workbook" | "support" | "august" | "unknown" {
  if (/\.xlsx?$/i.test(name) || /Trial Balance/i.test(firstText)) return "workbook";
  if (/Business Checking Statement|Invoice \/ statement/i.test(firstText)) return "support";
  if (/Financial Statements/i.test(firstText) && /August 31/i.test(firstText)) return "august";
  return "unknown";
}
