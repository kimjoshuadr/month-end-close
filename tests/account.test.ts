import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { compute } from "../lib/engine";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { parseWorkbook } from "../lib/parse/workbook";
import { firstRowForAccount } from "../lib/trace";
import type { Packet } from "../lib/types";

async function loaded() {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  const packet: Packet = { ...w, ...s };
  return { packet, computed: compute(packet, {}, {}) };
}

describe("firstRowForAccount", () => {
  it("finds the income row driven by an account", async () => {
    const { computed } = await loaded();
    expect(firstRowForAccount(computed, 6000)).toEqual({ table: "isMonth", label: "Wages" });
    expect(firstRowForAccount(computed, 4000)).toEqual({ table: "isMonth", label: "Landscape Services Revenue" });
  });
  it("finds balance-sheet and cash-flow rows", async () => {
    const { computed } = await loaded();
    expect(firstRowForAccount(computed, 2000)).toEqual({ table: "bs", label: "Accounts Payable" });
    expect(firstRowForAccount(computed, 6170)).toEqual({ table: "isMonth", label: "Depreciation" });
  });
  it("returns null for unknown accounts", async () => {
    const { computed } = await loaded();
    expect(firstRowForAccount(computed, 9999)).toBeNull();
  });
});
