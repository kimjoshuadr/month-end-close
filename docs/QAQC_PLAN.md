# QA/QC plan: recruiter instructions vs. tool (Playwright)

Runs against a production build (`npm run build && npm start -p 3200`), Chromium, three viewports (desktop 1440x900, tablet 820x1180, mobile 390x844). Spec files in `e2e/`, run with `npx playwright test`. Each test maps to a line of the instructions. A failure means the requirement is not met.

| ID | Instruction requirement | Test (e2e) | Pass condition |
|---|---|---|---|
| R1 | Open the tool | `smoke.spec`: every route (/, /entries, /open-items, /statements, /audit) | HTTP 200, no console errors, no uncaught page errors, header visible |
| R2 | Upload the packet (PDF, spreadsheet or text) | `upload.spec`: setInputFiles with the 3 sample files from `samples/` (not Load sample) | Both rows LOADED; strip Adjusted NI = $24,697.50; August PDF accepted without error |
| R2b | Text upload | `upload.spec`: a .txt version of the supporting text and a .csv TB | Classified and loaded, or clear error for an unrelated .txt |
| R2c | Bad input | `upload.spec`: upload a random .txt / an image | Clear error message, app does not crash |
| R3 | Extract figures and tie back to the TB | `upload.spec` | Validation grid has 5 rows, all OK (bank 84,320; payroll 20,350; materials 14,200; fuel 4,300; loan 1,640) |
| R4 | Schedule-driven + invoice/payroll entries | `entries.spec` | AJE-001 1,800; AJE-002 2,400; AJE-003 3,052.50; AJE-004 1,250 all Booked |
| R5 | Entries balance, TB accounts only, source on every line | `entries.spec`: expand every entry | Each record footer Dr = Cr; every line has a non-empty source; account numbers are in the TB list (2600 only with the 'new account, requires approval' label) |
| R6 | Show NI effect | `entries.spec` | Bridge: 38,200 to 24,697.50, sum of steps = (13,502.50) |
| R7 | Flag every unsettled item | `openitems.spec` | 7 worklist rows; $5,000 transfer, AP support $9,490, Aug cutoff, Northline present |
| R8 | Answer in a short typed exchange, entries update | `openitems.spec`: type "it was a loan" on the transfer and send | Option becomes Loan; transcript shows exchange; entry AJE-005 credits 2600 with approval label |
| R9 | Answer changes and returns cleanly | `openitems.spec`: Revenue, then Contribution | NI 29,697.50, then back to 24,697.50 |
| R10 | Accountant adjusts any value, totals update | `entries.spec`: edit AJE-004 debit and credit to 2,000 | NI 23,947.50; Dr = Cr; Reset restores 24,697.50 |
| R10b | Unbalanced edit is visible | `entries.spec`: edit only the debit | Out-of-balance indicator shown, no NaN anywhere |
| R11 | Statements in file 03 format | `statements.spec` | Tabs Cover, IS month, IS YTD, BS, CF, TTM render; IS month revenue 91,500 vs 2025 78,475; BS total assets 231,120 = L+E; CF ending cash 84,320, beginning 59,900; YTD NI 209,945 (rounded); TTM Sep-26 column NI 24,698 |
| R12 | Prior-year / YTD / beginning balances from August | `statements.spec` | 2025 Sep column values equal the August TTM Sep-25 (e.g. landscape 56,312) |
| R13 | Review and edit before final; nothing sent | `statements.spec` | DRAFT ribbon while unresolved > 0; reviewer note saves and appears in the Audit Trail; Mark as final toggles FINAL; no outbound requests other than same-origin /api/* (route spy) |
| R14 | Change an input, statements refresh | `statements.spec`: answer Aug cutoff = Correct, go to statements | NI 25,715; balance sheet still balances |
| R15 | Drill-down / source traceability | `statements.spec`: click Utilities | Panel shows AJE-004 and the Lakeside invoice |
| R16 | Session survives reload | `smoke.spec` | After reload, NI and answers unchanged; Reset session clears |
| R17 | Ask AI works (key set) / degrades (no key) | `ai.spec` (tagged @ai, runs only if DEEPSEEK_API_KEY is set) | Drawer returns an answer mentioning Green Valley; without key shows disabled message |
| R18 | Responsive | every spec at the 3 viewports; `layout.spec` | No horizontal overflow of the document body; header sticky after scroll; screenshots saved to `docs/screenshots/qa/` |
| R19 | Accessibility basics | `a11y.spec` with @axe-core/playwright on each route | No serious/critical violations |

Out of Playwright scope, checked manually: Docker build on Coolify (no Docker locally), write-up content vs. section 2-4 of the instructions.
