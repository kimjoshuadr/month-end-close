import { compute } from "../lib/engine";
import type { Answer, Answers, Computed, Overrides, Packet } from "../lib/types";

export type AuditEntry = { ts: string; msg: string };

export type StoreState = {
  packet: Packet | null;
  answers: Answers;
  overrides: Overrides;
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
  | { type: "set-loading"; loading: boolean }
  | { type: "set-upload"; missing: string[]; errors: string[] };

export function createInitial(): StoreState {
  return { packet: null, answers: {}, overrides: {}, audit: [], final: false, loading: false, missing: [], errors: [] };
}

function stamp(msg: string): AuditEntry {
  return { ts: new Date().toISOString(), msg };
}

// Pure state transitions; the provider adds persistence-free React wiring.
export function reducer(s: StoreState, a: StoreAction): StoreState {
  switch (a.type) {
    case "packet-loaded":
      return { ...s, packet: a.packet, answers: {}, overrides: {}, final: false, loading: false, missing: [], errors: [], audit: [...s.audit, stamp(a.msg)] };
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
    case "set-loading":
      return { ...s, loading: a.loading };
    case "set-upload":
      return { ...s, missing: a.missing, errors: a.errors, loading: false };
    default:
      return s;
  }
}

export function selectComputed(s: StoreState): Computed | null {
  return s.packet ? compute(s.packet, s.answers, s.overrides) : null;
}
