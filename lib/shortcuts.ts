// Pure keyboard-shortcut state machine. The Shell owns the `pendingG`
// state and a timeout; Open Items reuses the same parser for j/k/1-3/Enter.
// `mod` is true when Ctrl or Cmd is held.

export type ShortcutAction =
  | "focus-search"
  | "goto-packet"
  | "goto-entries"
  | "goto-open"
  | "goto-statements"
  | "goto-audit"
  | "next-item"
  | "prev-item"
  | "opt-1"
  | "opt-2"
  | "opt-3"
  | "save"
  | "close"
  | "help"
  | "undo";

export function isEditableTarget(t: unknown): boolean {
  if (!t || typeof t !== "object") return false;
  const el = t as HTMLElement;
  const tag = (el.tagName ?? "").toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return false;
}

export function nextShortcut(
  pendingG: boolean,
  key: string,
  inField: boolean,
  mod = false
): { action: ShortcutAction | null; pendingG: boolean } {
  const none = (p: boolean) => ({ action: null as ShortcutAction | null, pendingG: p });
  if (key === "Escape") return { action: "close", pendingG: false };
  if (mod && (key === "z" || key === "Z")) {
    return inField ? none(false) : { action: "undo", pendingG: false };
  }
  if (inField || mod) return none(false);
  if (key === "?") return { action: "help", pendingG: false };
  if (key === "/") return { action: "focus-search", pendingG: false };
  if (pendingG) {
    switch (key) {
      case "p": return { action: "goto-packet", pendingG: false };
      case "e": return { action: "goto-entries", pendingG: false };
      case "o": return { action: "goto-open", pendingG: false };
      case "s": return { action: "goto-statements", pendingG: false };
      case "a": return { action: "goto-audit", pendingG: false };
      default: return none(false);
    }
  }
  if (key === "g") return none(true);
  switch (key) {
    case "j": return { action: "next-item", pendingG: false };
    case "k": return { action: "prev-item", pendingG: false };
    case "1": return { action: "opt-1", pendingG: false };
    case "2": return { action: "opt-2", pendingG: false };
    case "3": return { action: "opt-3", pendingG: false };
    case "Enter": return { action: "save", pendingG: false };
    default: return none(false);
  }
}
