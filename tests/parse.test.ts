import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf, classifyFile } from "../lib/parse/pdfs";

const WB = "samples/01_Month_End_Workbook_Sep2026 (1).xlsx";
const SUP = "samples/02_Supporting_Documents_Sep2026 (1).pdf";

async function buf(p: string): Promise<ArrayBuffer> {
  const b = await readFile(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

describe("workbook parsing", () => {
  it("TB has 28 rows and debits = credits = 332020", async () => {
    const { tb } = parseWorkbook(await buf(WB));
    expect(tb).toHaveLength(28);
    const d = tb.reduce((s, r) => s + r.debit, 0);
    const c = tb.reduce((s, r) => s + r.credit, 0);
    expect(d).toBe(332020);
    expect(c).toBe(332020);
  });
  it("payroll grossPerPeriod 9250 and taxRate 0.1", async () => {
    const { payroll } = parseWorkbook(await buf(WB));
    expect(payroll.grossPerPeriod).toBe(9250);
    expect(payroll.taxRate).toBe(0.1);
  });
  it("prepaid Sep row recorded is No", async () => {
    const { prepaid } = parseWorkbook(await buf(WB));
    const sep = prepaid.rows.find((r) => r.month.startsWith("Sep"));
    expect(sep?.recorded).toBe("No");
    expect(prepaid.monthlyAmort).toBe(1800);
  });
});

describe("supporting pdf parsing", () => {
  it("bank has 19 activity lines and end 84320", async () => {
    const { bank } = await parseSupportingPdf(await buf(SUP));
    expect(bank.lines).toHaveLength(19);
    expect(bank.end).toBe(84320);
    expect(bank.begin).toBe(59900);
  });
  it("finds Lakeside 1250 and Northline date 10/02/2026", async () => {
    const { invoices } = await parseSupportingPdf(await buf(SUP));
    const lakeside = invoices.find((i) => i.vendor.toLowerCase().includes("lakeside"));
    expect(lakeside?.total).toBe(1250);
    const northline = invoices.find((i) => i.vendor.toLowerCase().includes("northline"));
    expect(northline?.date).toBe("10/02/2026");
    expect(northline?.total).toBe(1600);
  });
  it("email body contains $5k", async () => {
    const { email } = await parseSupportingPdf(await buf(SUP));
    expect(email.body).toContain("$5k");
    expect(email.from.toLowerCase()).toContain("dana");
  });
});

describe("classifyFile", () => {
  it("returns unknown for a non-packet file", () => {
    expect(classifyFile("random.txt", "hello world")).toBe("unknown");
  });
  it("classifies the workbook", () => {
    expect(classifyFile("book.xlsx", "Unadjusted Trial Balance")).toBe("workbook");
  });
  it("route reports a non-packet file", async () => {
    const { parseUpload } = await import("../lib/parse/parse");
    const res = await parseUpload([{ name: "random.txt", buf: new ArrayBuffer(0), head: "hello world" }]);
    expect(res.packet).toBeUndefined();
    expect(res.errors.join(" ")).toMatch(/not a recognized packet file/);
    expect(res.missing).toContain("workbook");
  });
});
