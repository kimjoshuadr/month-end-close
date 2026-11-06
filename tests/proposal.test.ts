import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { buildProposal } from "../lib/engine/proposal";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

const byId = (p: Packet, answers = {}) => {
  const prop = buildProposal(p, answers);
  return Object.fromEntries(prop.ajes.map((a) => [a.id, a]));
};

describe("proposal defaults", () => {
  it("books prepaid, depreciation, payroll accrual, electric, owner transfer", async () => {
    const p = await packet();
    const ajes = byId(p);
    expect(ajes.prepaid.lines).toEqual([
      { acct: 6160, debit: 1800, credit: 0, source: expect.any(String) },
      { acct: 1300, debit: 0, credit: 1800, source: expect.any(String) },
    ]);
    expect(ajes.depreciation.lines).toEqual([
      { acct: 6170, debit: 2400, credit: 0, source: expect.any(String) },
      { acct: 1510, debit: 0, credit: 2400, source: expect.any(String) },
    ]);
    expect(ajes["payroll-accrual"].lines).toEqual([
      { acct: 6000, debit: 2775, credit: 0, source: expect.any(String) },
      { acct: 6010, debit: 277.5, credit: 0, source: expect.any(String) },
      { acct: 2200, debit: 0, credit: 3052.5, source: expect.any(String) },
    ]);
    expect(ajes.electric.lines).toEqual([
      { acct: 6110, debit: 1250, credit: 0, source: expect.any(String) },
      { acct: 2000, debit: 0, credit: 1250, source: expect.any(String) },
    ]);
    expect(ajes["owner-transfer"].status).toBe("booked");
    expect(ajes["owner-transfer"].assumed).toBe(true);
    expect(ajes["owner-transfer"].lines).toEqual([
      { acct: 4000, debit: 5000, credit: 0, source: expect.any(String) },
      { acct: 3100, debit: 0, credit: 5000, source: expect.any(String) },
    ]);
  });
  it("every booked AJE balances, has sources, uses TB accounts", async () => {
    const p = await packet();
    const tbAccts = new Set(p.tb.map((r) => r.no));
    const prop = buildProposal(p, {});
    for (const a of prop.ajes) {
      if (a.status !== "booked") continue;
      const d = a.lines.reduce((s, l) => s + l.debit, 0);
      const c = a.lines.reduce((s, l) => s + l.credit, 0);
      expect(d).toBeCloseTo(c, 2);
      for (const l of a.lines) {
        expect(l.source.length).toBeGreaterThan(0);
        expect(tbAccts.has(l.acct)).toBe(true);
      }
    }
  });
  it("flags already-recorded and out-of-period items as checked", async () => {
    const p = await packet();
    const prop = buildProposal(p, {});
    const text = prop.checked.map((c) => `${c.title} ${c.reason}`).join("\n");
    expect(text).toMatch(/Green Valley/i);
    expect(text).toMatch(/Materials/i);
    expect(text).toMatch(/Summit/i);
    expect(text).toMatch(/Fuel/i);
    expect(text).toMatch(/Northline/i);
    expect(text).toMatch(/October/i);
  });
  it("tie-outs match", async () => {
    const p = await packet();
    const prop = buildProposal(p, {});
    const ties = Object.fromEntries(prop.ties.map((t) => [t.label, t]));
    expect(ties["bank-cash"].actual).toBe(84320);
    expect(ties["bank-cash"].ok).toBe(true);
    expect(ties["payroll-bank"].actual).toBe(20350);
    expect(ties["payroll-bank"].ok).toBe(true);
    expect(ties["materials"].actual).toBe(14200);
    expect(ties["materials"].ok).toBe(true);
    expect(ties["fuel"].actual).toBe(4300);
    expect(ties["fuel"].ok).toBe(true);
    expect(ties["loan-principal"].actual).toBe(1640);
    expect(ties["loan-principal"].ok).toBe(true);
  });
});

describe("proposal answers", () => {
  it("owner-transfer loan uses 2600; revenue is not booked", async () => {
    const p = await packet();
    const loan = byId(p, { "owner-transfer": { option: "loan" } })["owner-transfer"];
    expect(loan.status).toBe("booked");
    expect(loan.lines).toEqual([
      { acct: 4000, debit: 5000, credit: 0, source: expect.any(String) },
      { acct: 2600, debit: 0, credit: 5000, source: expect.any(String) },
    ]);
    const rev = byId(p, { "owner-transfer": { option: "revenue" } })["owner-transfer"];
    expect(rev.status).toBe("not_booked");
  });
  it("aug-cutoff correct and northline accrue book", async () => {
    const p = await packet();
    const cutoff = byId(p, { "aug-cutoff": { option: "correct" } })["aug-cutoff"];
    expect(cutoff.status).toBe("booked");
    expect(cutoff.lines).toEqual([
      { acct: 3900, debit: 1017.5, credit: 0, source: expect.any(String) },
      { acct: 6000, debit: 0, credit: 925, source: expect.any(String) },
      { acct: 6010, debit: 0, credit: 92.5, source: expect.any(String) },
    ]);
    const north = byId(p, { northline: { option: "accrue" } }).northline;
    expect(north.status).toBe("booked");
    expect(north.lines).toEqual([
      { acct: 6100, debit: 1600, credit: 0, source: expect.any(String) },
      { acct: 2000, debit: 0, credit: 1600, source: expect.any(String) },
    ]);
  });
});
