"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { TraceKey } from "../lib/trace";

type Drill = { key: TraceKey | null; open: (k: TraceKey) => void; close: () => void };

const Ctx = createContext<Drill>({ key: null, open: () => {}, close: () => {} });

export function DrillProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = useState<TraceKey | null>(null);
  const open = useCallback((k: TraceKey) => setKey(k), []);
  const close = useCallback(() => setKey(null), []);
  return <Ctx.Provider value={{ key, open, close }}>{children}</Ctx.Provider>;
}

export function useDrill(): Drill {
  return useContext(Ctx);
}
