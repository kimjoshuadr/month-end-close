import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { createInitial, HISTORY_LIMIT, reducer, selectCanUndo, selectComputed } from "../state/reducer";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("undo history", () => {
  it("answer then undo restores net income and logs to the audit trail", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    const base = selectComputed(s)?.netIncomeAdj;
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "revenue" }, msg: "answer revenue" });
    expect(selectComputed(s)?.netIncomeAdj).not.toBe(base);
    expect(selectCanUndo(s)).toBe(true);
    s = reducer(s, { type: "undo" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(base);
    expect(selectCanUndo(s)).toBe(false);
    expect(s.audit[s.audit.length - 1].msg).toMatch(/^Undo:/);
  });
  it("override then undo restores the edited amount", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    const base = selectComputed(s)?.netIncomeAdj;
    s = reducer(s, { type: "override", key: "electric:0", value: 2000, msg: "edit" });
    expect(selectComputed(s)?.netIncomeAdj).not.toBe(base);
    s = reducer(s, { type: "undo" });
    expect(selectComputed(s)?.netIncomeAdj).toBe(base);
    expect(s.overrides).toEqual({});
  });
  it("final toggle and reviewer note undo exactly", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "toggle-final" });
    expect(s.final).toBe(true);
    s = reducer(s, { type: "note", report: "bs", text: "checked", msg: "Reviewer note saved for Balance Sheet" });
    expect(s.notes.bs).toBe("checked");
    s = reducer(s, { type: "undo" });
    expect(s.notes.bs).toBeUndefined();
    expect(s.final).toBe(true);
    s = reducer(s, { type: "undo" });
    expect(s.final).toBe(false);
  });
  it("undo with empty history is a no-op", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    const before = s;
    s = reducer(s, { type: "undo" });
    expect(s).toBe(before);
  });
  it("history is capped at 20 steps", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      s = reducer(s, { type: "override", key: "electric:0", value: 1000 + i, msg: `edit ${i}` });
    }
    expect(s.past.length).toBe(HISTORY_LIMIT);
    s = reducer(s, { type: "undo" });
    expect(s.overrides["electric:0"]).toBe(1000 + HISTORY_LIMIT + 5 - 2);
    expect(s.past.length).toBe(HISTORY_LIMIT - 1);
  });
  it("loading a packet or resetting clears history", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "loan" }, msg: "loan" });
    expect(selectCanUndo(s)).toBe(true);
    s = reducer(s, { type: "packet-loaded", packet: await packet(), msg: "reloaded" });
    expect(selectCanUndo(s)).toBe(false);
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "loan" }, msg: "loan" });
    s = reducer(s, { type: "reset" });
    expect(s).toEqual(createInitial());
  });
});
