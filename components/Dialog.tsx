"use client";

import { useEffect, useRef } from "react";
import { IconX } from "./icons";

// Slide-over panel: 200ms slide over a dimmed backdrop, focus moves in and
// is trapped, Esc or backdrop click closes, focus returns to the trigger.
export function Dialog({
  label,
  title,
  eyebrow,
  wide,
  onClose,
  children,
  closeLabel,
}: {
  label: string;
  title: string;
  eyebrow: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeLabel: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocus.current = (document.activeElement as HTMLElement) ?? null;
    const panel = panelRef.current;
    if (panel) {
      const f = panel.querySelector<HTMLElement>(
        "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
      );
      (f ?? panel).focus({ preventScroll: true });
    }
    const restore = prevFocus.current;
    return () => {
      if (restore && document.contains(restore)) restore.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(
      "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )].filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className={`drawer${wide ? " wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>{eyebrow}</p>
            <strong className="drawer-title">{title}</strong>
          </div>
          <button className="iconbtn" onClick={onClose} aria-label={closeLabel} autoFocus>
            <IconX />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}
