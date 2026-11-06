import type { Answers, Computed, Overrides, Packet } from "../types";
import { buildProposal } from "./proposal";
import { adjustedTb, applyOverrides, buildStatements, netIncomeOfTb } from "./statements";

// Packet + answers + overrides -> everything the UI renders.
export function compute(packet: Packet, answers: Answers, overrides: Overrides): Computed {
  const proposal = buildProposal(packet, answers);
  const ajes = applyOverrides(proposal.ajes, overrides);
  const adjTb = adjustedTb(packet.tb, ajes);
  const netIncomeUnadj = netIncomeOfTb(packet.tb);
  const netIncomeAdj = netIncomeOfTb(adjTb);
  const statements = buildStatements(packet, ajes);
  const assetTotal = statements.bs.rows.find((r) => r.label === "TOTAL ASSETS")!.values[0];
  const leTotal = statements.bs.rows.find((r) => r.label === "TOTAL LIABILITIES & EQUITY")!.values[0];
  const ajesBalanced = ajes.filter((a) => a.status === "booked").every((a) => Math.abs(a.lines.reduce((s, l) => s + l.debit, 0) - a.lines.reduce((s, l) => s + l.credit, 0)) < 0.005);
  const balanced = ajesBalanced && Math.abs(assetTotal - leTotal) < 0.005;
  const unresolved = proposal.flags.filter((f) => (f.kind === "decision" ? answers[f.id]?.option === undefined : !answers[f.id]?.ack)).length;
  return { proposal: { ...proposal, ajes }, adjTb, netIncomeUnadj, netIncomeAdj, balanced, statements, unresolved };
}
