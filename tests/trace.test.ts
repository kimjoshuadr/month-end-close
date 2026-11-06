import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { compute } from "../lib/engine";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { parseWorkbook } from "../lib/parse/workbook";
import { traceFor } from "../lib/trace";
import type { Packet } from "../lib/types";

async function loaded() {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  const packet: Packet = { ...w, ...s };
  return { packet, computed: compute(packet, {}, {}) };
}

describe("traceFor", () => {
  it("traces a booked entry with sources and rule", async () => {
    const { packet, computed } = await loaded();
    const t = traceFor(packet, computed, { kind: "entry", ajeId: "payroll-accrual" });
    expect(t?.badges[0].text).toBe("Booked");
    expect(t?.sources.length).toBeGreaterThan(0);
    expect(t?.rule).toMatch(/working days/);
  });
  it("flags assumed entries", async () => {
    const { packet, computed } = await loaded();
    const t = traceFor(packet, computed, { kind: "entry", ajeId: "owner-transfer" });
    expect(t?.badges.map((b) => b.text)).toContain("Assumed, unconfirmed");
    expect(t?.flag?.title).toMatch(/\$5,000/);
    expect(t?.sources.map((s) => s.excerpt).join(" ")).toMatch(/Dana/);
  });
  it("traces a statement row to its entries", async () => {
    const { packet, computed } = await loaded();
    const t = traceFor(packet, computed, { kind: "statement", table: "isMonth", label: "Wages" });
    expect(t?.lines.map((l) => l.label).join(" ")).toMatch(/payroll-accrual|Accrued payroll/);
    const ni = traceFor(packet, computed, { kind: "statement", table: "isMonth", label: "Net Income/(Loss)" });
    expect(ni?.lines[0].value).toBe("$24,697.50");
  });
  it("traces a tie-out with expected and actual", async () => {
    const { packet, computed } = await loaded();
    const t = traceFor(packet, computed, { kind: "tie", label: "bank-cash" });
    expect(t?.lines.map((l) => l.value)).toEqual(["$84,320.00", "$84,320.00"]);
  });
  it("returns null for unknown keys", async () => {
    const { packet, computed } = await loaded();
    expect(traceFor(packet, computed, { kind: "entry", ajeId: "nope" })).toBeNull();
    expect(traceFor(packet, computed, { kind: "statement", table: "bs", label: "Nope" })).toBeNull();
    expect(traceFor(packet, computed, { kind: "tie", label: "nope" })).toBeNull();
  });
});
