"use client";

import { useEffect, useRef, useState } from "react";

// True for ~ms after `value` changes (not on mount). Powers the brief blue
// tint on changed cells; under reduced motion CSS renders a static outline.
export function useChanged<T>(value: T, ms = 1200): boolean {
  const [changed, setChanged] = useState(false);
  const prev = useRef(value);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      prev.current = value;
      return;
    }
    if (!Object.is(prev.current, value)) {
      prev.current = value;
      setChanged(true);
      const t = window.setTimeout(() => setChanged(false), ms);
      return () => window.clearTimeout(t);
    }
  }, [value, ms]);
  return changed;
}

// Inline wrapper that tints its children briefly when `value` changes.
export function Changed({ value, children }: { value: unknown; children: React.ReactNode }) {
  const changed = useChanged(value);
  return <span className={changed ? "tint" : undefined}>{children}</span>;
}
