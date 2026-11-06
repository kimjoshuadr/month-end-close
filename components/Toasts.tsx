"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useStore } from "../state/store";

export type ToastOpts = { undo?: boolean };

type Toast = { id: number; msg: string; undo?: boolean };

const Ctx = createContext<{ push: (msg: string, opts?: ToastOpts) => void }>({ push: () => {} });

export function useToasts() {
  return useContext(Ctx);
}

const LIFE = 5000;

function Item({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const { undo } = useStore();
  const [out, setOut] = useState(false);
  const remain = useRef(LIFE);
  const endAt = useRef(0);
  const timer = useRef(0);
  const done = useRef(false);

  const dismiss = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setOut(true);
    window.setTimeout(onDone, 200);
  }, [onDone]);

  const start = useCallback(() => {
    window.clearTimeout(timer.current);
    endAt.current = Date.now() + remain.current;
    timer.current = window.setTimeout(dismiss, remain.current);
  }, [dismiss]);

  useEffect(() => {
    start();
    return () => window.clearTimeout(timer.current);
  }, [start]);

  return (
    <div
      className={`toast${out ? " out" : ""}`}
      role="status"
      onMouseEnter={() => {
        window.clearTimeout(timer.current);
        remain.current = Math.max(0, endAt.current - Date.now());
      }}
      onMouseLeave={() => {
        if (!done.current) start();
      }}
    >
      <span>{toast.msg}</span>
      <span style={{ flex: 1 }} />
      {toast.undo && (
        <button
          onClick={() => {
            undo();
            dismiss();
          }}
        >
          Undo
        </button>
      )}
      <button onClick={dismiss} aria-label="Dismiss notification">✕</button>
    </div>
  );
}

// Bottom-right stack, max 3, 5s auto-dismiss that pauses on hover.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const id = useRef(0);

  const push = useCallback((msg: string, opts?: ToastOpts) => {
    id.current += 1;
    const t: Toast = { id: id.current, msg, undo: opts?.undo };
    setItems((prev) => [...prev.slice(-2), t]);
  }, []);

  const remove = useCallback((rm: number) => {
    setItems((prev) => prev.filter((t) => t.id !== rm));
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="toasts" aria-live="off">
        {items.map((t) => (
          <Item key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}
