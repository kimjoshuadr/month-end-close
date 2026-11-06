import { describe, expect, it } from "vitest";
import { isEditableTarget, nextShortcut } from "../lib/shortcuts";

describe("nextShortcut", () => {
  it("maps / to focus-search and ? to help", () => {
    expect(nextShortcut(false, "/", false)).toEqual({ action: "focus-search", pendingG: false });
    expect(nextShortcut(false, "?", false)).toEqual({ action: "help", pendingG: false });
  });
  it("handles g-then-letter module jumps and clears on other keys", () => {
    expect(nextShortcut(false, "g", false)).toEqual({ action: null, pendingG: true });
    expect(nextShortcut(true, "p", false).action).toBe("goto-packet");
    expect(nextShortcut(true, "e", false).action).toBe("goto-entries");
    expect(nextShortcut(true, "o", false).action).toBe("goto-open");
    expect(nextShortcut(true, "s", false).action).toBe("goto-statements");
    expect(nextShortcut(true, "a", false).action).toBe("goto-audit");
    expect(nextShortcut(true, "x", false)).toEqual({ action: null, pendingG: false });
  });
  it("maps j/k/1-3/Enter and Escape", () => {
    expect(nextShortcut(false, "j", false).action).toBe("next-item");
    expect(nextShortcut(false, "k", false).action).toBe("prev-item");
    expect(nextShortcut(false, "1", false).action).toBe("opt-1");
    expect(nextShortcut(false, "2", false).action).toBe("opt-2");
    expect(nextShortcut(false, "3", false).action).toBe("opt-3");
    expect(nextShortcut(false, "Enter", false).action).toBe("save");
    expect(nextShortcut(false, "Escape", false).action).toBe("close");
  });
  it("ignores single-key shortcuts while typing, but Escape still closes", () => {
    expect(nextShortcut(false, "j", true)).toEqual({ action: null, pendingG: false });
    expect(nextShortcut(false, "/", true)).toEqual({ action: null, pendingG: false });
    expect(nextShortcut(true, "o", true)).toEqual({ action: null, pendingG: false });
    expect(nextShortcut(false, "Escape", true).action).toBe("close");
  });
  it("maps Ctrl/Cmd+Z to undo outside fields only", () => {
    expect(nextShortcut(false, "z", false, true).action).toBe("undo");
    expect(nextShortcut(false, "Z", false, true).action).toBe("undo");
    expect(nextShortcut(false, "z", true, true)).toEqual({ action: null, pendingG: false });
    expect(nextShortcut(false, "z", false, false).action).toBeNull();
  });
  it("returns null for anything else", () => {
    expect(nextShortcut(false, "q", false)).toEqual({ action: null, pendingG: false });
  });
});

describe("isEditableTarget", () => {
  it("detects inputs, textareas, selects and content-editables", () => {
    const el = (tagName: string, isContentEditable = false) => ({ tagName, isContentEditable });
    expect(isEditableTarget(el("INPUT"))).toBe(true);
    expect(isEditableTarget(el("textarea"))).toBe(true);
    expect(isEditableTarget(el("SELECT"))).toBe(true);
    expect(isEditableTarget(el("DIV"))).toBe(false);
    expect(isEditableTarget(el("DIV", true))).toBe(true);
    expect(isEditableTarget(el("BUTTON"))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
    expect(isEditableTarget(undefined)).toBe(false);
  });
});
