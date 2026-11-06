import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { compute } from "../lib/engine";
import { fluxReview } from "../lib/engine/flux";
import { septFigures } from "../lib/engine/statements";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("reversing entries", () => {
  it("marks accruals to auto-reverse on 2026-10-01 without moving September NI", async () => {
    const p = await packet();
    for (const answers of [{}, { "owner-transfer": { option: "revenue" } }, { northline: { option: "accrue" } }, { "aug-cutoff": { option: "correct" } }]) {
      const c = compute(p, answers, {});
      const byId = Object.fromEntries(c.proposal.ajes.map((a) => [a.id, a]));
      expect(byId["payroll-accrual"].reverseOn).toBe("2026-10-01");
      expect(byId["electric"].reverseOn).toBe("2026-10-01");
      expect(byId["owner-transfer"].reverseOn).toBeUndefined();
      expect(byId["aug-cutoff"].reverseOn).toBeUndefined();
    }
    expect(compute(p, {}, {}).netIncomeAdj).toBe(24697.5);
    expect(compute(p, { "owner-transfer": { option: "revenue" } }, {}).netIncomeAdj).toBe(29697.5);
  });
  it("marks northline only when accrued", async () => {
    const p = await packet();
    expect(compute(p, {}, {}).proposal.ajes.find((a) => a.id === "northline")?.reverseOn).toBeUndefined();
    expect(compute(p, { northline: { option: "accrue" } }, {}).proposal.ajes.find((a) => a.id === "northline")?.reverseOn).toBe("2026-10-01");
  });
});

const BASE = {
  "Landscape Services Revenue": 70000, "Maintenance Contract Revenue": 25000, Wages: 20000, Materials: 14000,
  Subcontractors: 7000, Rent: 5200, Fuel: 4000, Utilities: 3000, "Repairs & Maintenance": 1500,
  "Payroll Taxes": 2000, Insurance: 1800, "Software & Subscriptions": 1100, "Professional Fees": 750,
  "Bank Fees": 300, Depreciation: 2400, "Interest Expense": 1000,
} as never;

describe("fluxReview", () => {
  it("is quiet when nothing moves", () => {
    const lines = fluxReview(BASE, { aug: BASE, sep25: BASE });
    expect(lines.length).toBe(16);
    expect(lines.every((l) => !l.flagged)).toBe(true);
  });
  it("flags big $ and big % vs either comparison, not one alone", () => {
    const up = { ...BASE, Wages: 23000 } as never;
    const w = fluxReview(up, { aug: BASE, sep25: BASE }).find((l) => l.line === "Wages")!;
    expect(w.flagged).toBe(true);
    expect(w.dAug).toBe(3000);
    expect(w.pctAug).toBe(15);
    const bigSmallPct = { ...BASE, "Landscape Services Revenue": 73000 } as never;
    expect(fluxReview(bigSmallPct, { aug: BASE, sep25: BASE }).find((l) => l.line === "Landscape Services Revenue")!.flagged).toBe(false);
    const smallBigPct = { ...BASE, "Bank Fees": 500 } as never;
    expect(fluxReview(smallBigPct, { aug: BASE, sep25: BASE }).find((l) => l.line === "Bank Fees")!.flagged).toBe(false);
    const sep = { ...BASE, Fuel: 6000 } as never;
    const f = fluxReview(sep, { aug: sep, sep25: BASE }).find((l) => l.line === "Fuel")!;
    expect(f.flagged).toBe(true);
    expect(f.dAug).toBe(0);
    expect(f.dSep25).toBe(2000);
  });
  it("handles zero and negative priors without divide-by-zero", () => {
    const zero = { ...BASE, Wages: 0 } as never;
    const w = fluxReview(zero, { aug: { ...BASE, Wages: 0 }, sep25: { ...BASE, Wages: 0 } } as never).find((l) => l.line === "Wages")!;
    expect(w.pctAug).toBeNull();
    expect(w.flagged).toBe(false);
    const neg = fluxReview(zero, { aug: { ...BASE, Wages: -2000 }, sep25: { ...BASE, Wages: -2000 } } as never).find((l) => l.line === "Wages")!;
    expect(neg.pctAug).toBe(100);
    expect(neg.flagged).toBe(true);
  });
  it("changes when an open item answer moves the close", async () => {
    const p = await packet();
    const figs = (answers: never) => septFigures(compute(p, answers, {}).adjTb);
    const before = fluxReview(figs({} as never));
    const after = fluxReview(figs({ "owner-transfer": { option: "revenue" } } as never));
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });
});
