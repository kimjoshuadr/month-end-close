import { describe, expect, it } from "vitest";
import { deltaWords, fmtDelta, fmtWhole } from "../components/format";

describe("fmtDelta", () => {
  it("signs deltas with U+2212 minus and + plus", () => {
    expect(fmtDelta(-5000)).toBe("−5,000.00");
    expect(fmtDelta(1017.5)).toBe("+1,017.50");
    expect(fmtDelta(0)).toBe("0.00");
  });
  it("describes the direction in words for live regions", () => {
    expect(deltaWords(-5000)).toBe("down 5,000.00");
    expect(deltaWords(1017.5)).toBe("up 1,017.50");
    expect(deltaWords(0)).toBe("unchanged");
  });
});

describe("fmtWhole", () => {
  it("shows whole dollars without cents", () => {
    expect(fmtWhole(66500)).toBe("66,500");
    expect(fmtWhole(0)).toBe("0");
  });
  it("rounds halves up", () => {
    expect(fmtWhole(24697.5)).toBe("24,698");
    expect(fmtWhole(3052.5)).toBe("3,053");
  });
  it("wraps negatives in parentheses", () => {
    expect(fmtWhole(-5990)).toBe("(5,990)");
  });
});

describe("ajeNo", () => {
  it("numbers entries AJE-001 through AJE-007 in stable order", async () => {
    const { ajeNo } = await import("../components/format");
    expect(ajeNo("prepaid")).toBe("AJE-001");
    expect(ajeNo("depreciation")).toBe("AJE-002");
    expect(ajeNo("payroll-accrual")).toBe("AJE-003");
    expect(ajeNo("electric")).toBe("AJE-004");
    expect(ajeNo("owner-transfer")).toBe("AJE-005");
    expect(ajeNo("aug-cutoff")).toBe("AJE-006");
    expect(ajeNo("northline")).toBe("AJE-007");
  });
  it("falls back to the raw id", async () => {
    const { ajeNo } = await import("../components/format");
    expect(ajeNo("mystery")).toBe("mystery");
  });
});
