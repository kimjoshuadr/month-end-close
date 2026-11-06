import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { compute } from "../lib/engine";
import { buildJeCsv, JE_CSV_HEADERS } from "../lib/export/journalCsv";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

function rows(csv: string): string[][] {
  // Minimal CSV parse honoring quoted fields for the balance check.
  const out: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (quoted) {
      if (c === '"') {
        if (csv[i + 1] === '"') { cur += '"'; i++; }
        else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); out.push(row); row = []; cur = ""; }
    else cur += c;
  }
  return out;
}

describe("buildJeCsv", () => {
  it("exports booked lines with headers, reversal dates, and balanced totals", async () => {
    const computed = compute(await packet(), {}, {});
    const names = new Map(computed.adjTb.map((r) => [r.no, r.name]));
    const csv = buildJeCsv(computed, names);
    const parsed = rows(csv);
    expect(parsed[0]).toEqual(JE_CSV_HEADERS);
    expect(parsed.length).toBeGreaterThan(2);
    const booked = computed.proposal.ajes.filter((a) => a.status === "booked");
    // One row per booked line.
    expect(parsed.length - 1).toBe(booked.reduce((s, a) => s + a.lines.length, 0));
    // No unbooked entries leak in.
    expect(csv).not.toContain("AJE-006");
    expect(csv).not.toContain("AJE-007");
    // Reversal dates ride along on reversing entries.
    const elec = parsed.filter((r) => r[0] === "AJE-004");
    expect(elec.length).toBeGreaterThan(0);
    expect(elec.every((r) => r[7] === "10/01/2026")).toBe(true);
    const pre = parsed.filter((r) => r[0] === "AJE-001");
    expect(pre.every((r) => r[7] === "")).toBe(true);
    // Totals balance.
    const dr = parsed.slice(1).reduce((s, r) => s + Number(r[4]), 0);
    const cr = parsed.slice(1).reduce((s, r) => s + Number(r[5]), 0);
    expect(Math.abs(dr - cr)).toBeLessThan(0.005);
  });
  it("escapes quotes, commas, and shows account names", async () => {
    const computed = compute(await packet(), {}, {});
    const names = new Map(computed.adjTb.map((r) => [r.no, r.name]));
    const csv = buildJeCsv(computed, names);
    // Lakeside source contains commas -> quoted field.
    expect(csv).toContain('"Lakeside invoice');
    expect(csv).toContain("Utilities");
  });
});
