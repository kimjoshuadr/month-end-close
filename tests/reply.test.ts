import { describe, expect, it } from "vitest";
import { mapReply } from "../lib/reply/mapReply";
import type { FlagOption } from "../lib/types";

const OT: FlagOption[] = [
  { id: "contribution", label: "Capital contribution (default)" },
  { id: "loan", label: "Loan from owner (adds acct 2600)" },
  { id: "revenue", label: "Already correct as revenue" },
];

describe("mapReply", () => {
  it("maps loan language to the loan option", () => {
    expect(mapReply("owner-transfer", "it was a loan", OT).option).toBe("loan");
  });
  it("maps capital language to contribution", () => {
    expect(mapReply("owner-transfer", "owner capital, personal funds", OT).option).toBe("contribution");
  });
  it("maps revenue language to revenue", () => {
    expect(mapReply("owner-transfer", "treat as revenue", OT).option).toBe("revenue");
  });
  it("extracts a custom amount", () => {
    expect(mapReply("owner-transfer", "use 4,500", OT).amount).toBe(4500);
  });
  it("maps cutoff and northline answers", () => {
    const cutoff: FlagOption[] = [{ id: "skip", label: "Leave as is (default)" }, { id: "correct", label: "Correct via retained earnings" }];
    expect(mapReply("aug-cutoff", "yes, correct it please", cutoff).option).toBe("correct");
    expect(mapReply("aug-cutoff", "leave as is", cutoff).option).toBe("skip");
    const north: FlagOption[] = [{ id: "skip", label: "Leave in October (default)" }, { id: "accrue", label: "Accrue in September" }];
    expect(mapReply("northline", "accrue it", north).option).toBe("accrue");
  });
  it("acknowledges info flags", () => {
    const ack: FlagOption[] = [{ id: "ack", label: "Acknowledge" }];
    expect(mapReply("ap-support", "acknowledged", ack).option).toBe("ack");
  });
  it("returns no option for unrecognized text", () => {
    expect(mapReply("owner-transfer", "hello there", OT).option).toBeUndefined();
  });
});
