import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { createInitial, reducer, selectComputed } from "../state/reducer";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("store reducer", () => {
  it("loads a packet and computes the default adjusted net income", async () => {
    let s = createInitial();
    s = reducer(s, { type: "packet-loaded", packet: await packet(), msg: "Sample packet loaded" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(24697.5);
    expect(s.audit.length).toBe(1);
  });
  it("setOverride changes computed net income", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "override", key: "electric:0", value: 2000, msg: "edit" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(24697.5 - 750);
  });
  it("setAnswer changes and restores computed net income", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "revenue" }, msg: "revenue" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(29697.5);
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "contribution" }, msg: "back" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(24697.5);
  });
  it("NaN override never produces NaN totals", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "override", key: "electric:0", value: NaN, msg: "nan" });
    expect(Number.isFinite(selectComputed(s)?.netIncomeAdj)).toBe(true);
  });
});
