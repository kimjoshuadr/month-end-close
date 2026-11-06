// Trust-boundary validation for the AI routes. Pure: no Next.js imports,
// so unit tests can exercise every branch.

export type ChatMsg = { role: "user" | "assistant"; content: string };

export const MAX_MESSAGE_CHARS = 2000;
export const KEEP_LAST_MESSAGES = 10;
export const MAX_QUESTION_CHARS = 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Keep only well-formed user/assistant string messages, trimmed, capped,
// last 10. Anything else is dropped; an empty result is an error.
export function sanitizeMessages(input: unknown): { messages: ChatMsg[]; error?: string } {
  if (!Array.isArray(input)) return { messages: [], error: "messages must be an array." };
  const out: ChatMsg[] = [];
  for (const m of input) {
    if (!isRecord(m)) continue;
    if (m.role !== "user" && m.role !== "assistant") continue;
    if (typeof m.content !== "string") continue;
    const content = m.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content && m.role === "user") continue;
    if (!content) continue;
    out.push({ role: m.role, content });
  }
  const kept = out.slice(-KEEP_LAST_MESSAGES);
  if (!kept.some((m) => m.role === "user")) return { messages: [], error: "Question must not be empty." };
  return { messages: kept };
}

// Single question input: trimmed, non-empty, capped at 1,000 chars.
export function sanitizeQuestion(input: unknown): { question?: string; error?: string } {
  if (typeof input !== "string" || !input.trim()) return { error: "Question must not be empty." };
  return { question: input.trim().slice(0, MAX_QUESTION_CHARS) };
}

export type ReplyInput = { flagId: string; text: string; options: { id: string; label: string }[] };

export function sanitizeReplyInput(input: unknown): { input?: ReplyInput; error?: string } {
  if (!isRecord(input)) return { error: "Request body must be an object." };
  if (typeof input.flagId !== "string" || !input.flagId) return { error: "flagId must be a string." };
  if (typeof input.text !== "string" || !input.text.trim()) return { error: "Reply text must not be empty." };
  const options = Array.isArray(input.options)
    ? input.options.filter((o): o is { id: string; label: string } => isRecord(o) && typeof o.id === "string" && typeof o.label === "string")
    : [];
  return { input: { flagId: input.flagId, text: input.text.trim().slice(0, MAX_QUESTION_CHARS), options } };
}
