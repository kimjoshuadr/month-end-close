import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { compute } from "../lib/engine";
import type { Packet, Statements } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

function val(t: { rows: { label: string; values: number[] }[] }, label: string, col = 0): number {
  const row = t.rows.find((r) => r.label === label);
  if (!row) throw new Error(`Missing row: ${label}`);
  return row.values[col];
}

describe("compute defaults", () => {
  it("net income unadjusted 38200, adjusted 24697.5, revenue 91500", async () => {
    const c = compute(await packet(), {}, {});
    expect(c.netIncomeUnadj).toBe(38200);
    expect(c.netIncomeAdj).toBe(24697.5);
    expect(val(c.statements.isMonth, "Total Sales")).toBe(91500);
  });
  it("balance sheet balances with acceptance totals", async () => {
    const c = compute(await packet(), {}, {});
    expect(val(c.statements.bs, "TOTAL ASSETS")).toBe(231120);
    expect(val(c.statements.bs, "Accounts Payable")).toBe(19700);
    expect(val(c.statements.bs, "Accrued Payroll")).toBe(3052.5);
    expect(val(c.statements.bs, "TOTAL LIABILITIES")).toBe(84752.5);
    expect(val(c.statements.bs, "TOTAL EQUITY")).toBe(146367.5);
    expect(c.balanced).toBe(true);
  });
  it("cash flow ties to bank", async () => {
    const c = compute(await packet(), {}, {});
    expect(val(c.statements.cf, "Net Cash Provided by Operating Activities")).toBe(21060);
    expect(val(c.statements.cf, "Net Cash Used in Financing Activities")).toBe(3360);
    expect(val(c.statements.cf, "Net Change in Cash")).toBe(24420);
    expect(val(c.statements.cf, "Cash at End of Period")).toBe(84320);
  });
  it("YTD adds August YTD plus September", async () => {
    const c = compute(await packet(), {}, {});
    expect(val(c.statements.isYtd, "Net Income/(Loss)")).toBe(185247 + 24697.5);
    expect(val(c.statements.isYtd, "Total Sales", 2)).toBe(434780 + 56312 + 179297 + 22163);
  });
  it("unresolved counts all seven flags until acknowledged", async () => {
    const p = await packet();
    expect(compute(p, {}, {}).unresolved).toBe(7);
    expect(compute(p, { "owner-transfer": { option: "contribution" } }, {}).unresolved).toBe(6);
  });
});

describe("compute answers and overrides", () => {
  it("owner-transfer revenue gives NI 29697.5 and still balances", async () => {
    const c = compute(await packet(), { "owner-transfer": { option: "revenue" } }, {});
    expect(c.netIncomeAdj).toBe(29697.5);
    expect(c.balanced).toBe(true);
  });
  it("electric override to 2000 lowers NI by 750", async () => {
    const p = await packet();
    const base = compute(p, {}, {}).netIncomeAdj;
    const over = compute(p, {}, { "electric:0": 2000 });
    expect(base - over.netIncomeAdj).toBe(750);
  });
  it("zero and NaN overrides do not produce NaN", async () => {
    const p = await packet();
    const z = compute(p, {}, { "electric:0": 0, "electric:1": 0 });
    expect(Number.isFinite(z.netIncomeAdj)).toBe(true);
    const n = compute(p, {}, { "electric:0": NaN });
    expect(Number.isFinite(n.netIncomeAdj)).toBe(true);
  });
  it("unbalanced override sets balanced false", async () => {
    const c = compute(await packet(), {}, { "electric:0": 2000 });
    expect(c.balanced).toBe(false);
  });
});
