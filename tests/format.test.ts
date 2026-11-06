import { describe, expect, it } from "vitest";
import { fmtWhole } from "../components/format";

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
