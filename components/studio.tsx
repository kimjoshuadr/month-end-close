"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { TraceKey } from "../lib/trace";

type UI = {
  trace: TraceKey | null;
  openTrace: (k: TraceKey) => void;
  closeTrace: () => void;
  auditOpen: boolean;
  setAuditOpen: (v: boolean) => void;
  askOpen: boolean;
  setAskOpen: (v: boolean) => void;
};

const Ctx = createContext<UI | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [trace, setTrace] = useState<TraceKey | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  return (
    <Ctx.Provider
      value={{ trace, openTrace: setTrace, closeTrace: () => setTrace(null), auditOpen, setAuditOpen, askOpen, setAskOpen }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useUI(): UI {
  const v = useContext(Ctx);
  if (!v) throw new Error("useUI must be used inside UIProvider");
  return v;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(q.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    q.addEventListener("change", fn);
    return () => q.removeEventListener("change", fn);
  }, []);
  return reduced;
}

// Count-up animation for a numeric figure; instant when reduced motion is on.
// Also reports the change direction briefly so deltas can flash.
export function useAnimatedNumber(value: number, duration = 600): { display: number; dir: -1 | 0 | 1 } {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const [dir, setDir] = useState<-1 | 0 | 1>(0);
  const prev = useRef(value);
  useEffect(() => {
    if (reduced || prev.current === value) {
      prev.current = value;
      setDisplay(value);
      setDir(0);
      return;
    }
    const from = prev.current;
    setDir(value > from ? 1 : -1);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(from + (value - from) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
      else prev.current = value;
    };
    raf = requestAnimationFrame(step);
    const clear = window.setTimeout(() => setDir(0), duration + 700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(clear);
      prev.current = value;
    };
  }, [value, duration, reduced]);
  return { display, dir };
}
