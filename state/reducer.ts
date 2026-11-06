import { compute } from "../lib/engine";
import type { Answer, Answers, Computed, Overrides, Packet } from "../lib/types";

export type AuditEntry = { ts: string; msg: string };

export type StoreState = {
  packet: Packet | null;
  answers: Answers;
  overrides: Overrides;
  notes: Record<string, string>;
  audit: AuditEntry[];
  final: boolean;
  loading: boolean;
  missing: string[];
  errors: string[];
};

export type StoreAction =
  | { type: "packet-loaded"; packet: Packet; msg: string }
  | { type: "answer"; id: string; answer: Answer; msg: string }
  | { type: "override"; key: string; value: number; msg: string }
  | { type: "log"; msg: string }
  | { type: "toggle-final" }
  | { type: "note"; report: string; text: string; msg: string }
  | { type: "set-loading"; loading: boolean }
  | { type: "set-upload"; missing: string[]; errors: string[] }
  | { type: "rehydrate"; state: StoreState }
  | { type: "reset" };

export function createInitial(): StoreState {
  return { packet: null, answers: {}, overrides: {}, notes: {}, audit: [], final: false, loading: false, missing: [], errors: [] };
}

function stamp(msg: string): AuditEntry {
  return { ts: new Date().toISOString(), msg };
}

// Pure state transitions; the provider adds persistence-free React wiring.
export function reducer(s: StoreState, a: StoreAction): StoreState {
  switch (a.type) {
    case "packet-loaded":
      return { ...s, packet: a.packet, answers: {}, overrides: {}, notes: {}, final: false, loading: false, missing: [], errors: [], audit: [...s.audit, stamp(a.msg)] };
    case "answer":
      return { ...s, answers: { ...s.answers, [a.id]: a.answer }, audit: [...s.audit, stamp(a.msg)] };
    case "override": {
      const v = Number(a.value);
      return { ...s, overrides: { ...s.overrides, [a.key]: Number.isFinite(v) ? v : 0 }, audit: [...s.audit, stamp(a.msg)] };
    }
    case "log":
      return { ...s, audit: [...s.audit, stamp(a.msg)] };
    case "toggle-final":
      return { ...s, final: !s.final, audit: [...s.audit, stamp(s.final ? "Reopened as draft" : "Marked as final (local state only)")] };
    case "note":
      return { ...s, notes: { ...s.notes, [a.report]: a.text }, audit: [...s.audit, stamp(a.msg)] };
    case "set-loading":
      return { ...s, loading: a.loading };
    case "set-upload":
      return { ...s, missing: a.missing, errors: a.errors, loading: false };
    case "rehydrate":
      return { ...a.state, loading: false, missing: [], errors: [] };
    case "reset":
      return createInitial();
    default:
      return s;
  }
}

export function selectComputed(s: StoreState): Computed | null {
  return s.packet ? compute(s.packet, s.answers, s.overrides) : null;
}

export const SESSION_KEY = "closedesk.session.v1";

// Persisted subset: everything needed to rebuild the close. Packet is plain JSON.
export function serializeState(s: StoreState): string {
  return JSON.stringify({ packet: s.packet, answers: s.answers, overrides: s.overrides, notes: s.notes, audit: s.audit, final: s.final });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

// Validate a stored session; null when missing, corrupt, or wrong-shaped.
export function deserializeState(raw: string | null | undefined): StoreState | null {
  if (!raw) return null;
  try {
    const o: unknown = JSON.parse(raw);
    if (!isRecord(o) || !isRecord(o.packet)) return null;
    const p = o.packet as Record<string, unknown>;
    if (!Array.isArray(p.tb) || !isRecord(p.bank) || !Array.isArray((p.bank as Record<string, unknown>).lines)) return null;
    if (!Array.isArray(p.invoices) || !isRecord(p.email)) return null;
    const answers: Answers = isRecord(o.answers) ? (o.answers as Answers) : {};
    const overrides: Overrides = {};
    if (isRecord(o.overrides)) {
      for (const [k, v] of Object.entries(o.overrides)) {
        if (typeof v === "number" && Number.isFinite(v)) overrides[k] = v;
      }
    }
    const audit: AuditEntry[] = Array.isArray(o.audit)
      ? o.audit.filter((e): e is AuditEntry => isRecord(e) && typeof e.ts === "string" && typeof e.msg === "string")
      : [];
    const notes: Record<string, string> = {};
    if (isRecord(o.notes)) {
      for (const [k, v] of Object.entries(o.notes)) {
        if (typeof v === "string") notes[k] = v;
      }
    }
    return { packet: o.packet as Packet, answers, overrides, notes, audit, final: o.final === true, loading: false, missing: [], errors: [] };
  } catch {
    return null;
  }
}
