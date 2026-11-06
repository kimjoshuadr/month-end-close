import { describe, expect, it } from "vitest";
import { parseSupportingText } from "../lib/parse/pdfs";
import { parseUpload } from "../lib/parse/parse";
import { parseTrialBalanceCsv } from "../lib/parse/workbook";

const BANK_TXT = `First Prairie Bank
Business Checking Statement
Account ending 2207 | Statement period: 09/01/2026 - 09/30/2026
Beginning balance 59,900.00
Total deposits and credits 10,000.00
Total withdrawals and debits 5,200.00
Ending balance 64,700.00
Account activity
Date Description Withdrawals Deposits Balance
09/01 Check 1048 - Westgate Properties (rent) 5,200.00 54,700.00
09/03 Deposit - Oakmont HOA 12,400.00 67,100.00
09/30 Monthly account and merchant fees 300.00 64,700.00
`;

const INVOICE_TXT = `Lakeside Electric & Power
PO Box 4410, Springfield, MO 65808
Invoice / statement: Acct 7710-3392 Statement
Date: 09/29/2026
Due: 10/19/2026
Service period 09/01/2026 - 09/30/2026 (shop and yard)
Description Qty Unit price Amount
Electric usage, 6,840 kWh 1 1,070.00 1,070.00
Demand and service charges 1 180.00 180.00
Total due 1,250.00
`;

const EMAIL_TXT = `From: Dana Whitfield <dana@greenlinelandscape.example>
To: Accounting Team
Date: Thursday, October 1, 2026
Subject: September close

Hi team,
The $5k that hit the account on the 12th was me covering payroll.
Thanks,
Dana
Greenline Landscape Co., LLC
Fictional email created for a hiring exercise.
`;

const TB_CSV = `Acct #,Account name,Debit,Credit
1000,Operating Checking,84320,
1200,Accounts Receivable,41800,
2000,Accounts Payable,,18450
4000,Landscape Services Revenue,,71500
5000,Materials,14200,
Total,,"98,520","89,950"
`;

const enc = (s: string) => new TextEncoder().encode(s).buffer as ArrayBuffer;

describe("text supporting documents", () => {
  it("parses bank, invoice, and email from raw text", () => {
    const r = parseSupportingText(`${BANK_TXT}\n${INVOICE_TXT}\n${EMAIL_TXT}`);
    expect(r.bank.end).toBe(64700);
    expect(r.bank.lines).toHaveLength(3);
    expect(r.invoices).toHaveLength(1);
    expect(r.invoices[0].total).toBe(1250);
    expect(r.email.body).toContain("$5k");
  });
});

describe("csv trial balance", () => {
  it("maps Acct #, name, debit, credit columns", () => {
    const tb = parseTrialBalanceCsv(TB_CSV);
    expect(tb).toHaveLength(5);
    expect(tb[0]).toEqual({ no: 1000, name: "Operating Checking", debit: 84320, credit: 0 });
    expect(tb.find((r) => r.no === 2000)).toEqual({ no: 2000, name: "Accounts Payable", debit: 0, credit: 18450 });
  });
});

describe("txt/csv upload", () => {
  it("classifies text files by content and reports missing schedules", async () => {
    const r = await parseUpload([
      { name: "tb.csv", buf: enc(TB_CSV) },
      { name: "support.txt", buf: enc(`${BANK_TXT}\n${INVOICE_TXT}\n${EMAIL_TXT}`) },
    ]);
    expect(r.errors).toEqual([]);
    expect(r.packet).toBeUndefined();
    expect(r.missing).toContain("schedules");
    expect(r.missing).not.toContain("workbook");
    expect(r.missing).not.toContain("supporting-documents");
  });
  it("rejects unknown text with a clear error", async () => {
    const r = await parseUpload([{ name: "notes.txt", buf: enc("hello world, nothing to see here") }]);
    expect(r.packet).toBeUndefined();
    expect(r.errors.join(" ")).toMatch(/not a recognized packet file/);
  });
});
