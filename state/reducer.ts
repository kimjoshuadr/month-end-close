import { compute } from "../lib/engine";
import type { Answer, Answers, Computed, Overrides, Packet, Signoff } from "../lib/types";

export type AuditEntry = { ts: string; msg: string };

// Restorable slice for undo: everything a mutating action can change.
export type Snapshot = {
  label: string;
  answers: Answers;
  overrides: Overrides;
  notes: Record<string, string>;
  fluxNotes: Record<string, string>;
  signoff: Signoff | null;
  final: boolean;
};

export const HISTORY_LIMIT = 20;

export type StoreState = {
  packet: Packet | null;
  answers: Answers;
  overrides: Overrides;
  notes: Record<string, string>;
  fluxNotes: Record<string, string>;
  signoff: Signoff | null;
  audit: AuditEntry[];
  final: boolean;
  loading: boolean;
  missing: string[];
  errors: string[];
  past: Snapshot[];
};

export type StoreAction =
  | { type: "packet-loaded"; packet: Packet; msg: string }
  | { type: "answer"; id: string; answer: Answer; msg: string }
  | { type: "override"; key: string; value: number; msg: string }
  | { type: "log"; msg: string }
  | { type: "toggle-final" }
  | { type: "note"; report: string; text: string; msg: string }
  | { type: "flux-note"; line: string; text: string; msg: string }
  | { type: "signoff"; preparedBy: string; reviewedBy: string; at: string; msg: string }
  | { type: "reopen" }
  | { type: "set-loading"; loading: boolean }
  | { type: "set-upload"; missing: string[]; errors: string[] }
  | { type: "rehydrate"; state: StoreState }
  | { type: "undo" }
  | { type: "reset" };

export function createInitial(): StoreState {
  return { packet: null, answers: {}, overrides: {}, notes: {}, fluxNotes: {}, signoff: null, audit: [], final: false, loading: false, missing: [], errors: [], past: [] };
}

function stamp(msg: string): AuditEntry {
  return { ts: new Date().toISOString(), msg };
}

function snap(s: StoreState, label: string): Snapshot {
  return { label, answers: s.answers, overrides: s.overrides, notes: s.notes, fluxNotes: s.fluxNotes, signoff: s.signoff, final: s.final };
}

// The pre-change snapshot goes on the stack; oldest drops past the limit.
function pushPast(s: StoreState, label: string): Snapshot[] {
  return [...s.past, snap(s, label)].slice(-HISTORY_LIMIT);
}

// Pure state transitions; the provider adds persistence-free React wiring.
export function reducer(s: StoreState, a: StoreAction): StoreState {
  switch (a.type) {
    case "packet-loaded":
      return { ...s, packet: a.packet, answers: {}, overrides: {}, notes: {}, fluxNotes: {}, signoff: null, final: false, loading: false, missing: [], errors: [], past: [], audit: [...s.audit, stamp(a.msg)] };
    case "answer":
      return { ...s, answers: { ...s.answers, [a.id]: a.answer }, past: pushPast(s, a.msg), audit: [...s.audit, stamp(a.msg)] };
    case "override": {
      const v = Number(a.value);
      return { ...s, overrides: { ...s.overrides, [a.key]: Number.isFinite(v) ? v : 0 }, past: pushPast(s, a.msg), audit: [...s.audit, stamp(a.msg)] };
    }
    case "log":
      return { ...s, audit: [...s.audit, stamp(a.msg)] };
    case "toggle-final": {
      const msg = s.final ? "Reopened as draft" : "Marked as final (local state only)";
      return { ...s, final: !s.final, past: pushPast(s, msg), audit: [...s.audit, stamp(msg)] };
    }
    case "note":
      return { ...s, notes: { ...s.notes, [a.report]: a.text }, past: pushPast(s, a.msg), audit: [...s.audit, stamp(a.msg)] };
    case "flux-note":
      return { ...s, fluxNotes: { ...s.fluxNotes, [a.line]: a.text }, past: pushPast(s, a.msg), audit: [...s.audit, stamp(a.msg)] };
    case "signoff":
      return { ...s, final: true, signoff: { preparedBy: a.preparedBy, reviewedBy: a.reviewedBy, at: a.at }, past: pushPast(s, a.msg), audit: [...s.audit, stamp(a.msg)] };
    case "reopen":
      return { ...s, final: false, signoff: null, past: pushPast(s, "Reopened as draft; sign-off cleared"), audit: [...s.audit, stamp("Reopened as draft; sign-off cleared")] };
    case "set-loading":
      return { ...s, loading: a.loading };
    case "set-upload":
      return { ...s, missing: a.missing, errors: a.errors, loading: false };
    case "rehydrate":
      return { ...a.state, loading: false, missing: [], errors: [], past: [] };
    case "undo": {
      const prev = s.past[s.past.length - 1];
      if (!prev) return s;
      return { ...s, answers: prev.answers, overrides: prev.overrides, notes: prev.notes, fluxNotes: prev.fluxNotes, signoff: prev.signoff, final: prev.final, past: s.past.slice(0, -1), audit: [...s.audit, stamp(`Undo: ${prev.label}`)] };
    }
    case "reset":
      return createInitial();
    default:
      return s;
  }
}

export function selectComputed(s: StoreState): Computed | null {
  return s.packet ? compute(s.packet, s.answers, s.overrides) : null;
}

export function selectCanUndo(s: StoreState): boolean {
  return s.past.length > 0;
}

export const SESSION_KEY = "closedesk.session.v1";

// Persisted subset: everything needed to rebuild the close. Packet is plain JSON.
export function serializeState(s: StoreState): string {
  return JSON.stringify({ packet: s.packet, answers: s.answers, overrides: s.overrides, notes: s.notes, fluxNotes: s.fluxNotes, signoff: s.signoff, audit: s.audit, final: s.final });
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
    const fluxNotes: Record<string, string> = {};
    if (isRecord(o.fluxNotes)) {
      for (const [k, v] of Object.entries(o.fluxNotes)) {
        if (typeof v === "string") fluxNotes[k] = v;
      }
    }
    const signoff =
      isRecord(o.signoff) && typeof o.signoff.preparedBy === "string" && typeof o.signoff.reviewedBy === "string" && typeof o.signoff.at === "string"
        ? { preparedBy: o.signoff.preparedBy, reviewedBy: o.signoff.reviewedBy, at: o.signoff.at }
        : null;
    return { packet: o.packet as Packet, answers, overrides, notes, fluxNotes, signoff, audit, final: o.final === true, loading: false, missing: [], errors: [], past: [] };
  } catch {
    return null;
  }
}
