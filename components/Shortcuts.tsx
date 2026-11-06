"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isEditableTarget, nextShortcut, type ShortcutAction } from "../lib/shortcuts";
import { useStore } from "../state/store";
import { Dialog } from "./Dialog";

export const SHORTCUT_HELP: { keys: string; what: string }[] = [
  { keys: "/", what: "Focus global search" },
  { keys: "g then p / e / o / s / a", what: "Go to Packet / Entries / Open Items / Statements / Audit" },
  { keys: "j / k", what: "Move through Open Items (on the worklist)" },
  { keys: "1 – 3", what: "Choose an option (on the worklist)" },
  { keys: "Enter", what: "Save the answer (on the worklist)" },
  { keys: "Ctrl/⌘ Z", what: "Undo the last change" },
  { keys: "Esc", what: "Close panels and dialogs" },
  { keys: "?", what: "Open this help" },
];

const ROUTES: Partial<Record<ShortcutAction, string>> = {
  "goto-packet": "/",
  "goto-entries": "/entries",
  "goto-open": "/open-items",
  "goto-statements": "/statements",
  "goto-audit": "/audit",
};

// Global keys: search, module jumps, help, Esc-for-help, Ctrl/Cmd+Z.
// Worklist keys (j/k/1-3/Enter) are broadcast for the Open Items page.
export function ShortcutManager() {
  const router = useRouter();
  const pathname = usePathname();
  const { undo, canUndo } = useStore();
  const [help, setHelp] = useState(false);
  const pendingG = useRef(false);
  const gTimer = useRef(0);
  const state = useRef({ undo, canUndo });
  state.current = { undo, canUndo };

  useEffect(() => {
    const clearG = () => {
      pendingG.current = false;
    };
    const fn = (e: KeyboardEvent) => {
      const inField = isEditableTarget(e.target);
      const mod = e.ctrlKey || e.metaKey;
      const { action, pendingG: pg } = nextShortcut(pendingG.current, e.key, inField, mod);
      window.clearTimeout(gTimer.current);
      pendingG.current = pg;
      if (pg) gTimer.current = window.setTimeout(clearG, 800);
      if (!action) return;
      if (action === "close") {
        setHelp((h) => {
          if (h) {
            e.preventDefault();
            return false;
          }
          return h;
        });
        return;
      }
      if (action === "help") {
        if (!inField) {
          e.preventDefault();
          setHelp(true);
        }
        return;
      }
      if (action === "focus-search") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
        return;
      }
      if (action === "undo") {
        e.preventDefault();
        if (state.current.canUndo) state.current.undo();
        return;
      }
      const route = ROUTES[action];
      if (route && route !== pathname) {
        router.push(route);
        return;
      }
      if (action === "next-item" || action === "prev-item" || action === "opt-1" || action === "opt-2" || action === "opt-3" || action === "save") {
        window.dispatchEvent(new CustomEvent<ShortcutAction>("close-shortcut", { detail: action }));
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      window.clearTimeout(gTimer.current);
    };
  }, [router, pathname]);

  if (!help) return null;
  return (
    <Dialog label="Keyboard shortcuts" title="Keyboard shortcuts" eyebrow="Help" onClose={() => setHelp(false)} closeLabel="Close shortcuts help">
      <div className="helpgrid">
        {SHORTCUT_HELP.map((h) => (
          <span key={h.keys} style={{ display: "contents" }}>
            <span><span className="kbd">{h.keys}</span></span>
            <span>{h.what}</span>
          </span>
        ))}
      </div>
    </Dialog>
  );
}
