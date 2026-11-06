import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { compute } from "../lib/engine";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { parseWorkbook } from "../lib/parse/workbook";
import { AUG, netIncome } from "../lib/reference/august";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

const col = (rows: { label: string; values: number[] }[], label: string, i: number) => {
  const row = rows.find((r) => r.label === label);
  if (!row) throw new Error(`Missing row: ${label}`);
  return row.values[i];
};

describe("ttm reference data", () => {
  it("transcribes Oct-25..Aug-26 revenue matching the PDF totals", () => {
    const land = AUG.ttm.figures.map((f) => f["Landscape Services Revenue"]);
    expect(land).toHaveLength(11);
    expect(land.reduce((s, v) => s + v, 0)).toBe(692343 - 56312);
    const ni = AUG.ttm.figures.map(netIncome);
    expect(ni.reduce((s, v) => s + v, 0)).toBe(259623 - 19083);
  });
  it("Oct-25 column equals the PDF values", () => {
    expect(AUG.ttm.figures[0]["Landscape Services Revenue"]).toBe(57627);
    expect(netIncome(AUG.ttm.figures[0])).toBe(21849);
  });
});

describe("ttm report", () => {
  it("totals revenue across months and ends with adjusted September", async () => {
    const c = compute(await packet(), {}, {});
    const ttm = c.statements.ttm;
    expect(ttm.headers.slice(0, 12)).toEqual(["Oct-25", "Nov-25", "Dec-25", "Jan-26", "Feb-26", "Mar-26", "Apr-26", "May-26", "Jun-26", "Jul-26", "Aug-26", "Sep-26"]);
    const months = ttm.headers.length - 2;
    const total = col(ttm.rows, "Total Sales", months);
    let sum = 0;
    for (let i = 0; i < months; i++) sum += col(ttm.rows, "Total Sales", i);
    expect(total).toBe(sum);
    expect(total).toBe(976763 - 78475 + 91500);
    expect(col(ttm.rows, "Net Income/(Loss)", 11)).toBe(24697.5);
  });
});
