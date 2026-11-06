# QA/QC report: recruiter instructions vs. tool (Playwright)

Date: 2026-11-06. Suite: `npx playwright test` (Chromium via system Chrome, production build on :3200). Projects: desktop 1440x900, tablet 820x1180, mobile 390x844. Unit suite: `npm test` (vitest) 66/66 green; `npm run build` green.

## Result matrix (each row ran on all three viewports)

| ID | Requirement | Result desktop | Result tablet | Result mobile |
|---|---|---|---|---|
| R1 | Every route serves cleanly | pass | pass | pass |
| R2 | Real upload of the 3 sample files, NI $24,697.50, August PDF accepted | pass | pass | pass |
| R2b | txt/csv classified; unrelated txt rejected | pass | pass | pass |
| R2c | Image upload errors cleanly, no crash | pass | pass | pass |
| R3 | 5 tie-outs all OK with exact values | pass | pass | pass |
| R4 | AJE-001..004 booked at 1,800 / 2,400 / 3,052.50 / 1,250 | pass | pass | pass |
| R5 | Records balance, sources, TB accounts, 2600 labelled/absent | pass | pass | pass |
| R6 | Bridge 38,200 to 24,697.50 | pass | pass | pass |
| R7 | 7 flags incl. $5k, AP $9,490, cutoff, Northline | pass | pass | pass |
| R8 | "it was a loan" books 2600 with approval label | pass | pass | pass |
| R9 | Revenue 29,697.50 then back to 24,697.50 | pass | pass | pass |
| R10 | Edit AJE-004 to 2,000, reset restores | pass | pass | pass |
| R10b | Debit-only edit flagged, no NaN | pass | pass | pass |
| R11 | Six reports, acceptance figures | pass | pass | pass |
| R12 | 2025 Sep column equals August Sep-25 | pass | pass | pass |
| R13 | Ribbon, notes in audit, final toggle, same-origin requests only | pass | pass | pass |
| R14 | Cutoff correction flows through, still balanced | pass | pass | pass |
| R15 | Utilities drills to AJE-004 + Lakeside | pass | pass | pass |
| R16 | Reload keeps session, reset clears | pass | pass | pass |
| R17 @ai | Live answer mentions Green Valley (key set) | pass | pass | pass |
| R17 | Disabled state (key stubbed off) | pass | pass | pass |
| R18 | No body overflow, sticky app bar, qa screenshots | pass | pass | pass |
| R19 | axe: no serious/critical violations | pass | pass | pass |

Total: 108/108. Nothing still failing.

## 2026-11-06: interactions refinement + AI formatting + security + enterprise close

R13 change (orchestrator-approved): "Mark as final" now opens a Prepared/Reviewed sign-off dialog instead of the legacy two-click confirm. Finalizing is blocked while open items or unexplained flux lines remain, and requires two different typed names. R13 keeps every original assertion (Draft ribbon, reviewer note in audit, Final status, same-origin requests) and adds the steps the dialog now needs: resolve/acknowledge all 7 items, explain flagged flux lines, sign as Dana Whitfield / Kim Okafor, plus a Cover-page names assertion. New coverage: C1 (blocked dialog shows reasons, same-name rejected, Esc closes), C2 (JE CSV: 12 lines, balanced, 10/01/2026 reversals), C3 (xlsx sheets), C4 (sign-off → cover names → audit → reopen clears), I1–I5 (toasts/undo, keyboard, hover preview, Esc, help, all-resolved), A1–A10 (AI markdown/XSS/empty/502-retry/typing/counters), RT1–RT9 (prompt-injection + jailbreak red team), S4 (upload guards), S6 (security headers). Live-model assertions are tolerant by design (refusals paraphrase); rerun the red-team file after any prompt/model change.

## Bugs found by the suite and fixed

1. Missing favicon → console 404 on every route (R1). Added `public/favicon.svg` + metadata icon.
2. Save-answer round-trip race: store persists in an effect, so immediate navigation lost state (R16, flaky). Helpers now wait for the session key in sessionStorage.
3. R15 asserted a drill line without the AJE number; drill lines now show `AJE-00x` via a shared `ajeDisplayNo` in lib (R15).
4. Mobile Ask AI icon-only button had no accessible name (R17/R19 mobile). Added `aria-label`.
5. Mobile `/open-items` overflowed 166px: nowrap NI span in option rows (R18). Wrapped + min-width guards.
6. Mobile `/statements` overflow: report tab row didn't wrap (R18).
7. a11y contrast (R19): white on brand blue 3.25 (primary buttons, Ask AI) → deepened to `--blue-dark`/`#00617f`; draft lozenge, assumed/unresolved dots text, count badge, ribbon text darkened to passing tones; links `#006d8c` (was 4.44 on canvas).
8. a11y scrollable regions (R19): strip, grids, tabs, report wrapper are now keyboard-focusable regions with labels.
9. Test bugs (not app): strict-mode duplicate matches, mid-animation strip reads (settle-aware helper), default Cover tab, "Unbalanced" vs old copy, production-only conditional-hook crash on `/open-items` (also fixed the app: hooks hoisted above the early return).

## Notes and weak spots

- R17 disabled case stubs `GET /api/chat` to `{enabled:false}` because `.env.local` carries a key; the live `@ai` test makes one real short call. No key material is printed or committed.
- Screenshots: `docs/screenshots/qa/` (per route × viewport, taken by layout.spec). The suite rebuilds the app via webServer on each run.
- Docker-on-Coolify is out of Playwright scope and NOT yet verified (no Docker locally); verify on first Coolify deploy. The write-up was checked against sections 2-4 of the instructions by hand.
