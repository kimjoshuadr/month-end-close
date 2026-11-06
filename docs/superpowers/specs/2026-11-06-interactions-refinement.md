# Interactions and animation refinement

Kim's answers: refine all four areas (live number changes, Open Items flow, entry editing, upload and drill-down); feedback "clear but quick"; add keyboard shortcuts, toasts with undo, loading skeletons, and polished button and side-panel interactions. Stay in the flat ERP console style: motion supports comprehension, never decoration. Engine and numbers are untouched.

## Motion system
- Tokens in CSS: `--dur-fast: 120ms`, `--dur: 200ms`, `--dur-slow: 400ms`, `--ease: cubic-bezier(.2,.8,.2,1)`. Use transform and opacity only (no layout-thrashing animations).
- Everything respects `prefers-reduced-motion: reduce`: values swap instantly, panels appear without sliding, highlights become a static outline for 2s.

## 1. Live number changes
- Summary strip and statement figures: when a value changes, roll from old to new over about 400ms (tabular numerals so width doesn't jitter), then show a small delta chip (e.g. `−5,000.00` orange / `+1,017.50` blue) next to the strip value that fades after 2s.
- Changed cells in grids and statements get a brief blue tint (about 1.2s fade).
- `aria-live="polite"` region announces e.g. "Adjusted net income now 29,697.50, down 5,000".
- Dr = Cr: when out of balance the chip turns red with a short shake (no shake under reduced motion) and the difference is shown.

## 2. Open Items flow
- Selecting a row: the selection bar slides to it; the detail panel crossfades content (no jump).
- Option rows: hover, pressed and selected states; the NI effect of the hovered option previews next to the current NI ("would be 29,697.50").
- Save answer: button shows a pending state for about 150ms, the row's status lozenge animates Unresolved to Answered, the progress count rolls, then auto-advance to the next unresolved item with a short slide. When the last one is resolved show a calm "All items resolved" state with a link to Financial Statements.
- Typed reply: the message appears in the transcript, a typing indicator shows while /api/reply runs, the reply appears, and the chosen option pulses once.

## 3. Entry editing
- Expand/collapse record panels with a height transition and a rotating chevron.
- Inline cell edit: clear edit affordance on hover (pencil icon and underline), Enter commits, Esc cancels, Tab moves to the next amount cell. Invalid input (non-numeric, negative) shows an inline error and is not committed.
- Edited cells keep a small marker; per-line Reset; the record footer Dr = Cr indicator updates with the same change feedback.

## 4. Upload and drill-down
- Drop zones: drag-over state (blue dashed border, background tint, "Release to upload"); invalid file type shakes and shows the error inline.
- While parsing: skeleton rows in the validation grid and a progress state on each file row; results then reveal row by row (staggered 40ms) with the status icons.
- Drill-down and Ask AI panels: slide in from the right (200ms) over a dimmed backdrop, focus moves into the panel and is trapped, Esc or backdrop click closes, focus returns to the trigger. Ask AI shows a typing indicator while waiting.

## 5. Toasts and undo
- Bottom-right toast stack (max 3, auto-dismiss 5s, pause on hover) for: answer saved, amount edited, reset, reviewer note saved, mark as final. Each shows the NI effect where relevant ("Answer saved: net income −5,000.00") with an **Undo** action.
- Undo restores the previous answers/overrides/final state exactly (reducer-level history of at most 20 steps; undo also logs to the audit trail). Ctrl/Cmd+Z triggers undo when focus is not in a text field.

## 6. Keyboard shortcuts
- `/` focus global search; `g` then `p` / `e` / `o` / `s` / `a` to switch modules; on Open Items `j` / `k` move through items, `1` to `3` choose an option, `Enter` saves; `Esc` closes panels; `?` opens a shortcuts help dialog. Shortcuts are ignored while typing in inputs.

## 7. Buttons and controls
- Consistent states for every button: hover, active (pressed, 1px translate), focus-visible ring, disabled, loading (spinner, keeps width). Primary, secondary and ghost variants only.
- Module tabs: underline slides between tabs.

## Constraints
- No new heavy animation library (CSS transitions plus small hooks; Web Animations API allowed).
- Unit tests for new logic (undo history, shortcut handling, delta formatting). Extend Playwright: undo restores NI after an answer, `j`/`k`/`1`/`Enter` resolves an item, Esc closes the drill-down, the reduced-motion project still passes. Existing 65 unit and 108 e2e tests must stay green.
