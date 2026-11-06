import type { FlagOption } from "../types";

export type MappedReply = { option?: string; amount?: number; explanation: string };

function amountOf(text: string): number | undefined {
  const m = /(\d[\d,]*(?:\.\d+)?)/.exec(text.replace(/^\D*?(?=\d)/, ""));
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function byId(text: string, options: FlagOption[]): string | undefined {
  const t = text.toLowerCase();
  for (const o of options) {
    if (o.id !== "ack" && t.includes(o.id)) return o.id;
  }
  return undefined;
}

// Deterministic keyword mapping from a typed reply to an option/amount.
export function mapReply(flagId: string, text: string, options: FlagOption[]): MappedReply {
  const t = text.toLowerCase();
  const amount = amountOf(text);
  const id = byId(t, options);

  const has = (...words: string[]) => words.some((w) => t.includes(w));
  let option: string | undefined = id;

  if (!option) {
    if (flagId === "owner-transfer") {
      if (has("loan", "borrow", "repay", "2600")) option = "loan";
      else if (has("contribut", "capital", "personal", "equity", "3100")) option = "contribution";
      else if (has("revenue", "income", "sales", "correct as")) option = "revenue";
    } else if (flagId === "aug-cutoff") {
      if (has("correct", "book", "adjust", "retained", "fix")) option = "correct";
      else if (has("skip", "leave", "immaterial", "as is", "prior period", "no change")) option = "skip";
    } else if (flagId === "northline") {
      if (has("accrue", "book", "september", "sep ")) option = "accrue";
      else if (has("skip", "october", "oct ", "leave", "no change")) option = "skip";
    } else {
      if (has("ack", "noted", "confirm", "agree", "understood", "ok")) option = "ack";
    }
  }

  if (option) return { option, amount, explanation: `Matched "${text.trim()}" to an option.` };
  if (amount !== undefined) return { amount, explanation: `Found amount ${amount.toLocaleString()}.` };
  return { explanation: "Pick an option above." };
}
