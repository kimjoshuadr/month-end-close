import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { signoffBlockers } from "../lib/signoff";
import { createInitial, reducer, selectCanUndo, serializeState, deserializeState } from "../state/reducer";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("signoffBlockers", () => {
  const clear = { preparedBy: "Dana", reviewedBy: "Kim", unresolved: 0, unexplained: 0 };
  it("passes when names differ and nothing is outstanding", () => {
    expect(signoffBlockers(clear)).toEqual([]);
  });
  it("requires both names, trimmed", () => {
    expect(signoffBlockers({ ...clear, preparedBy: "  " })).toContain("Enter who prepared the close.");
    expect(signoffBlockers({ ...clear, reviewedBy: "" })).toContain("Enter who reviewed the close.");
  });
  it("requires different people, ignoring case and whitespace", () => {
    expect(signoffBlockers({ ...clear, reviewedBy: " dana " })).toContain(
      "Prepared by and Reviewed by must be different people."
    );
  });
  it("blocks while work remains", () => {
    expect(signoffBlockers({ ...clear, unresolved: 2 })[0]).toMatch(/2 open items remain/);
    expect(signoffBlockers({ ...clear, unexplained: 1 })[0]).toMatch(/1 flagged flux line needs/);
  });
});

describe("flux notes and sign-off state", () => {
  it("saves flux explanations, persists them, and undoes them", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "flux-note", line: "Wages", text: "3/10 accrual.", msg: "Flux explanation saved for Wages" });
    expect(s.fluxNotes.Wages).toBe("3/10 accrual.");
    expect(s.audit[s.audit.length - 1].msg).toMatch(/Flux explanation saved/);
    expect(selectCanUndo(s)).toBe(true);
    const restored = deserializeState(serializeState(s));
    expect(restored?.fluxNotes.Wages).toBe("3/10 accrual.");
    s = reducer(s, { type: "undo" });
    expect(s.fluxNotes.Wages).toBeUndefined();
  });
  it("signs off with names and timestamps, and reopens cleanly", async () => {
    let s = reducer(createInitial(), { type: "packet-loaded", packet: await packet(), msg: "loaded" });
    s = reducer(s, { type: "signoff", preparedBy: "Dana", reviewedBy: "Kim", at: "2026-10-05T12:00:00.000Z", msg: "Marked as final by Dana, reviewed by Kim" });
    expect(s.final).toBe(true);
    expect(s.signoff).toEqual({ preparedBy: "Dana", reviewedBy: "Kim", at: "2026-10-05T12:00:00.000Z" });
    expect(s.audit[s.audit.length - 1].msg).toMatch(/Marked as final/);
    const restored = deserializeState(serializeState(s));
    expect(restored?.signoff?.reviewedBy).toBe("Kim");
    s = reducer(s, { type: "reopen" });
    expect(s.final).toBe(false);
    expect(s.signoff).toBeNull();
    expect(s.audit[s.audit.length - 1].msg).toMatch(/Reopened/);
  });
});
