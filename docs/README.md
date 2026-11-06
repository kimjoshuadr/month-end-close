# Project docs

How Month-End Close was designed, built and checked. Read in this order:

| Doc | What it is |
|---|---|
| [SUBMISSION.md](SUBMISSION.md) | The write-up sent with the exercise: how it works, automated vs. accountant, how AI was used, limits, production needs |
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Narrated 5-minute walkthrough script |
| [Design spec](superpowers/specs/2026-11-06-month-end-close-tool-design.md) | The original design: packet analysis, traps found by hand, expected numbers used as tests |
| [Implementation plan](superpowers/plans/2026-11-06-month-end-close-tool.md) | Ten test-first tasks handed to the executor agent |
| [Guided Studio redesign](superpowers/specs/2026-11-06-redesign-guided-studio.md) | A design direction explored and then rejected |
| [ERP console redesign](superpowers/specs/2026-11-06-redesign-erp-console.md) | The NetSuite/Intacct-style direction that shipped |
| [Interactions spec](superpowers/specs/2026-11-06-interactions-refinement.md) | Motion, undo, keyboard shortcuts, toasts |
| [QAQC_PLAN.md](QAQC_PLAN.md) / [QAQC_REPORT.md](QAQC_REPORT.md) | Every requirement in the brief mapped to a Playwright test, and the results |
| [SECURITY_REVIEW.md](SECURITY_REVIEW.md) | Threats, red-team prompts, upload and header checks, residual risks |
| [screenshots/](screenshots/) | Pages at 390, 820 and 1440 px; interaction sequences; QA captures |
