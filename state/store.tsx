"use client";

import { createContext, useCallback, useContext, useMemo, useReducer } from "react";
import { compute } from "../lib/engine";
import type { Answer, Computed, Packet } from "../lib/types";
import { createInitial, reducer, type AuditEntry } from "./reducer";

export type UploadResult = { ok: boolean; missing: string[]; errors: string[] };

type Store = {
  computed: Computed | null;
  packet: Packet | null;
  loading: boolean;
  missing: string[];
  errors: string[];
  final: boolean;
  audit: AuditEntry[];
  loadSample: () => Promise<UploadResult>;
  upload: (files: File[]) => Promise<UploadResult>;
  setAnswer: (id: string, a: Answer) => void;
  setOverride: (key: string, n: number) => void;
  toggleFinal: () => void;
};

const Ctx = createContext<Store | null>(null);

async function postFiles(files: { name: string; blob: Blob }[]) {
  const form = new FormData();
  for (const f of files) form.append("files", f.blob, f.name);
  const res = await fetch("/api/parse", { method: "POST", body: form });
  return (await res.json()) as { packet?: Packet; missing: string[]; errors: string[] };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, createInitial);

  const loadSample = useCallback(async (): Promise<UploadResult> => {
    dispatch({ type: "set-loading", loading: true });
    try {
      const names = ["workbook-sep2026.xlsx", "supporting-sep2026.pdf"];
      const blobs = await Promise.all(names.map(async (n) => ({ name: n, blob: await (await fetch(`/samples/${n}`)).blob() })));
      const r = await postFiles(blobs);
      dispatch({ type: "set-upload", missing: r.missing, errors: r.errors });
      if (r.packet) dispatch({ type: "packet-loaded", packet: r.packet, msg: "Sample packet loaded (workbook + supporting documents)" });
      else dispatch({ type: "log", msg: `Sample load failed: ${r.errors.join("; ")}` });
      return { ok: !!r.packet, missing: r.missing, errors: r.errors };
    } catch (e) {
      dispatch({ type: "set-upload", missing: ["workbook", "supporting-documents"], errors: [String(e)] });
      return { ok: false, missing: ["workbook", "supporting-documents"], errors: [String(e)] };
    }
  }, []);

  const upload = useCallback(async (files: File[]): Promise<UploadResult> => {
    dispatch({ type: "set-loading", loading: true });
    const r = await postFiles(files.map((f) => ({ name: f.name, blob: f })));
    dispatch({ type: "set-upload", missing: r.missing, errors: r.errors });
    if (r.packet) dispatch({ type: "packet-loaded", packet: r.packet, msg: `Uploaded ${files.map((f) => f.name).join(", ")}` });
    else dispatch({ type: "log", msg: `Upload rejected: ${r.errors.join("; ") || r.missing.join(", ")}` });
    return { ok: !!r.packet, missing: r.missing, errors: r.errors };
  }, []);

  const setAnswer = useCallback((id: string, a: Answer) => {
    dispatch({ type: "answer", id, answer: a, msg: `Open item ${id} answered: ${JSON.stringify(a)}` });
  }, []);

  const setOverride = useCallback((key: string, n: number) => {
    dispatch({ type: "override", key, value: n, msg: `Entry amount edited ${key} = ${n}` });
  }, []);

  const toggleFinal = useCallback(() => dispatch({ type: "toggle-final" }), []);

  const value = useMemo<Store>(() => {
    const computed: Computed | null = s.packet ? compute(s.packet, s.answers, s.overrides) : null;
    return { computed, packet: s.packet, loading: s.loading, missing: s.missing, errors: s.errors, final: s.final, audit: s.audit, loadSample, upload, setAnswer, setOverride, toggleFinal };
  }, [s, loadSample, upload, setAnswer, setOverride, toggleFinal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
