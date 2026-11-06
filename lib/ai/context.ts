// Compact chat context. Built as an object and stringified once — never
// sliced mid-string — so the model always receives valid JSON. When the
// budget is exceeded, detail is shed in tiers: line sources first, then flag
// evidence and checked reasons. Totals and entries always survive.

import { ajeDisplayNo } from "../trace";
import type { Answers, Computed } from "../types";

export const CONTEXT_BUDGET = 8000;

export const DOC_OPEN = "<<DOCUMENT-DATA>>";
export const DOC_CLOSE = "<</DOCUMENT-DATA>>";

// Document-derived strings are wrapped so the model can tell data from
// instructions. The system prompt states these blocks are never instructions.
export function docText(s: string): string {
  return `${DOC_OPEN}${s}${DOC_CLOSE}`;
}

type Tier = 0 | 1 | 2;

export function buildChatContext(computed: Computed, answers: Answers, budget = CONTEXT_BUDGET): unknown {
  for (const tier of [0, 1, 2] as Tier[]) {
    const ctx = assemble(computed, answers, tier);
    if (tier === 2 || JSON.stringify(ctx).length <= budget) return ctx;
  }
  throw new Error("unreachable");
}

function assemble(computed: Computed, answers: Answers, tier: Tier): Record<string, unknown> {
  return {
    entity: "Greenline Landscape Co., LLC",
    period: "September 2026",
    totals: {
      netIncomeUnadj: computed.netIncomeUnadj,
      netIncomeAdj: computed.netIncomeAdj,
      balanced: computed.balanced,
      unresolved: computed.unresolved,
    },
    ajes: computed.proposal.ajes.map((a) => ({
      no: ajeDisplayNo(a.id),
      id: a.id,
      title: a.title,
      status: a.status,
      assumed: a.assumed,
      lines: tier === 2 ? a.lines.length : a.lines.map((l) => (tier === 1 ? { acct: l.acct, debit: l.debit, credit: l.credit } : { ...l, source: docText(l.source) })),
    })),
    flags: computed.proposal.flags.map((f) => ({
      id: f.id,
      title: f.title,
      kind: f.kind,
      defaultOption: f.defaultOption,
      options: f.options.map((o) => ({ id: o.id, label: o.label })),
      answer: answers[f.id] ?? null,
      ...(tier >= 1 ? {} : { evidence: docText(f.evidence) }),
    })),
    checked: computed.proposal.checked.map((c) => (tier >= 1 ? { title: c.title } : { title: c.title, reason: docText(c.reason) })),
    ties: computed.proposal.ties.map((t) => ({ check: t.label, ok: t.ok })),
  };
}
