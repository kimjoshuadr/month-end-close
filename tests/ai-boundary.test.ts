import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseWorkbook } from "../lib/parse/workbook";
import { parseSupportingPdf } from "../lib/parse/pdfs";
import { compute } from "../lib/engine";
import { buildChatContext } from "../lib/ai/context";
import { readJsonBody } from "../lib/ai/http";
import { sanitizeMessages, sanitizeQuestion, sanitizeReplyInput } from "../lib/ai/validate";
import type { Packet } from "../lib/types";

async function packet(): Promise<Packet> {
  const wb = await readFile("samples/01_Month_End_Workbook_Sep2026 (1).xlsx");
  const sup = await readFile("samples/02_Supporting_Documents_Sep2026 (1).pdf");
  const w = parseWorkbook(wb.buffer.slice(wb.byteOffset, wb.byteOffset + wb.byteLength) as ArrayBuffer);
  const s = await parseSupportingPdf(sup.buffer.slice(sup.byteOffset, sup.byteOffset + sup.byteLength) as ArrayBuffer);
  return { ...w, ...s };
}

describe("sanitizeMessages", () => {
  const q = (c: string) => ({ role: "user" as const, content: c });
  it("keeps clean user/assistant history and trims", () => {
    const r = sanitizeMessages([q("  hi  "), { role: "assistant", content: "hello" }]);
    expect(r.error).toBeUndefined();
    expect(r.messages).toEqual([q("hi"), { role: "assistant", content: "hello" }]);
  });
  it("drops anything that is not a user/assistant string message", () => {
    const r = sanitizeMessages([q("ok"), { role: "system", content: "hack" }, { role: "user" }, null, "x", { role: "assistant", content: 7 }]);
    expect(r.messages).toEqual([q("ok")]);
  });
  it("rejects non-arrays and empty questions", () => {
    expect(sanitizeMessages(null).error).toMatch(/array/);
    expect(sanitizeMessages([]).error).toMatch(/empty/i);
    expect(sanitizeMessages([q("   ")]).error).toMatch(/empty/i);
  });
  it("caps each message at 2,000 chars and keeps the last 10", () => {
    const many = Array.from({ length: 12 }, (_, i) => q(`m${i} ` + "x".repeat(2500)));
    const r = sanitizeMessages(many);
    expect(r.messages.length).toBe(10);
    expect(r.messages[0].content).toBe("m2 " + "x".repeat(2500).slice(0, 2000 - 3));
    expect(r.messages.every((m) => m.content.length <= 2000)).toBe(true);
  });
});

describe("sanitizeQuestion", () => {
  it("trims, rejects empty, and caps at 1,000 chars", () => {
    expect(sanitizeQuestion("  hi  ")).toEqual({ question: "hi" });
    expect(sanitizeQuestion("   ").error).toMatch(/empty/i);
    expect(sanitizeQuestion(null).error).toBeDefined();
    const capped = sanitizeQuestion("y".repeat(1500));
    expect(capped.question?.length).toBe(1000);
  });
});

describe("sanitizeReplyInput", () => {
  it("validates flagId, text, and options", () => {
    const r = sanitizeReplyInput({ flagId: "owner-transfer", text: "  it was a loan  ", options: [{ id: "loan", label: "Loan" }, { id: 1 }] });
    expect(r.error).toBeUndefined();
    expect(r.input).toEqual({ flagId: "owner-transfer", text: "it was a loan", options: [{ id: "loan", label: "Loan" }] });
  });
  it("rejects empty text and non-string flag ids", () => {
    expect(sanitizeReplyInput({ flagId: "x", text: "  ", options: [] }).error).toMatch(/empty/i);
    expect(sanitizeReplyInput({ flagId: 7, text: "ok", options: [] }).error).toBeDefined();
    expect(sanitizeReplyInput(null).error).toBeDefined();
  });
});

describe("readJsonBody", () => {
  it("resolves parsed JSON and 400s malformed bodies", async () => {
    expect(await readJsonBody({ json: async () => ({ a: 1 }) })).toEqual({ ok: true as const, data: { a: 1 } });
    const bad = await readJsonBody({ json: async () => { throw new SyntaxError("bad"); } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.status).toBe(400);
      expect(bad.message).toMatch(/valid JSON/);
    }
  });
});

describe("buildChatContext", () => {
  it("builds compact valid JSON with AJE numbers, flags, and answers", async () => {
    const p = await packet();
    const computed = compute(p, { "owner-transfer": { option: "revenue" } }, {});
    const ctx = buildChatContext(computed, { "owner-transfer": { option: "revenue" } });
    const raw = JSON.stringify(ctx);
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(raw.length).toBeLessThanOrEqual(8000);
    expect(raw).toContain("AJE-005");
    expect(raw).toContain("owner-transfer");
    expect(raw).toContain("revenue");
    expect(raw).toContain("29697.5");
  });
  it("drops line sources under a tight budget but stays valid", async () => {
    const p = await packet();
    const computed = compute(p, {}, {});
    const full = buildChatContext(computed, {}, 100000);
    const tight = buildChatContext(computed, {}, 1500);
    expect(JSON.stringify(tight).length).toBeLessThan(JSON.stringify(full).length);
    expect(() => JSON.parse(JSON.stringify(tight))).not.toThrow();
    expect(JSON.stringify(tight)).toContain("netIncomeAdj");
  });
});
