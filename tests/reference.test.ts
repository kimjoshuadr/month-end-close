import { describe, expect, it } from "vitest";
import { AUG, netIncome } from "../lib/reference/august";

describe("august reference", () => {
  it("Aug YTD 2026 net income equals 185,247", () => {
    expect(netIncome(AUG.is.ytd)).toBe(185247);
  });
  it("Aug YTD 2025 net income equals 158,720", () => {
    expect(netIncome(AUG.is.ytd2025)).toBe(158720);
  });
  it("Sep-25 net income equals 19,083", () => {
    expect(netIncome(AUG.sep2025)).toBe(19083);
  });
  it("Aug balance sheet total assets is 206,000", () => {
    expect(AUG.bs.totalAssets).toBe(206000);
  });
});
