import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { createInitial, deserializeState, reducer, selectComputed, serializeState } from "../state/reducer";
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
  it("serializes and restores the full session", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "loan" }, msg: "loan" });
    s = reducer(s, { type: "override", key: "electric:0", value: 2000, msg: "edit" });
    s = reducer(s, { type: "toggle-final" });
    const restored = deserializeState(serializeState(s));
    expect(restored).not.toBeNull();
    expect(restored!.answers).toEqual(s.answers);
    expect(restored!.overrides).toEqual(s.overrides);
    expect(restored!.final).toBe(true);
    expect(restored!.audit).toEqual(s.audit);
    expect(selectComputed(restored!)?.netIncomeAdj).toBe(selectComputed(s)?.netIncomeAdj);
    expect(selectComputed(restored!)?.balanced).toBe(selectComputed(s)?.balanced);
  });
  it("rejects corrupt or wrong-shape sessions", () => {
    expect(deserializeState(null)).toBeNull();
    expect(deserializeState("{{{not json")).toBeNull();
    expect(deserializeState(JSON.stringify({ packet: { tb: [] } }))).toBeNull();
    expect(deserializeState(JSON.stringify({ hello: "world" }))).toBeNull();
  });
  it("rehydrate restores state and reset clears it", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "answer", id: "owner-transfer", answer: { option: "loan" }, msg: "loan" });
    const restored = deserializeState(serializeState(s));
    const rehydrated = reducer(createInitial(), { type: "rehydrate", state: restored! });
    expect(selectComputed(rehydrated)?.netIncomeAdj).toBe(selectComputed(s)?.netIncomeAdj);
    expect(rehydrated.answers).toEqual({ "owner-transfer": { option: "loan" } });
    const cleared = reducer(rehydrated, { type: "reset" });
    expect(cleared).toEqual(createInitial());
    expect(selectComputed(cleared)).toBeNull();
  });
  it("reviewer notes persist and log to the audit trail", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "note", report: "isMonth", text: "NI ties to bridge.", msg: "Reviewer note saved for Income Statement — month" });
    expect(s.notes.isMonth).toBe("NI ties to bridge.");
    expect(s.audit[s.audit.length - 1].msg).toMatch(/Reviewer note saved/);
    const restored = deserializeState(serializeState(s));
    expect(restored?.notes.isMonth).toBe("NI ties to bridge.");
  });
});
