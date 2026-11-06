# Submission write-up

## What I built
Close Desk, a single-page web tool (Next.js, Docker). Upload the packet (or one-click "Load sample packet"), see drafted AJEs with a source on every line and a net income bridge, work through flagged items (buttons or typed replies), edit any amount, and view September 2026 statements (income statement month and YTD, balance sheet, cash flows) in the August format. Every change recomputes everything.

## How it works end to end
1. Deterministic parsers extract the trial balance, payroll register, prepaid and fixed-asset schedules, bank lines, invoices and the client email, then tie them out (bank to TB cash, payroll to Gusto debits, expense lines to bank plus invoices, loan principal).
2. A pure engine drafts entries: prepaid amortization $1,800, depreciation $2,400, payroll accrual $3,052.50 (3 of 10 working days of Sep 26 to Oct 9), unrecorded Lakeside electric $1,250, and a reclass of the $5,000 owner transfer out of revenue.
3. It deliberately does not book: Green Valley and Summit Fuel (already in the TB, derived by matching TB vs bank + invoices), and Northline rental (October period).
4. Seven items are flagged (the $5,000 transfer, $9,490 of AP with no support, the Aug 31 payroll cutoff, the accrual method, revenue classification, no September distributions, Northline). Answering one changes the entries and statements immediately.
5. Statements use August balances and prior-year comparatives (Sep-25 from the TTM page), so September ties to August.

## Automated vs accountant
Automated: extraction, tie-outs, schedule/invoice/payroll entries, statements, recompute. Accountant: the $5,000 treatment, AP support, prior-period payroll cutoff, accepting assumptions, final review. Entries booked on a documented default carry an "assumed" badge until answered. Unsupported items are never booked silently.

## How I used AI to build it
I acted as orchestrator in Claude Code: read the packet myself to find the traps and compute expected numbers by hand (adjusted net income $24,697.50, total assets $231,120), brainstormed the design with clarifying questions, had a separate reviewer agent challenge the design doc, wrote a task-by-task plan with test assertions, then delegated implementation to Muse Spark 1.3 Contributor via OpenCode. I reviewed each handoff by re-running tests and screenshotting at mobile, tablet and desktop widths. Iterations that came from review: overrides not reaching the entry cards, state lost on reload (now sessionStorage), tablet and mobile table clipping, statements switched to whole dollars as in the August PDF. Logic that touches money is covered by 46 tests built from my hand calculations.

## Not finished / limits
- Parsing is tuned to this packet's layout; other layouts rely on the DeepSeek fallback, which I could not test broadly.
- Statements round each value to whole dollars like the August PDF, so a total can differ by $1 from a hand re-foot of the rounded lines.
- TTM page not built (optional). Docker build was not run on my machine (no Docker locally); verify on Coolify.
- The $5,000 treatment and the revenue account it was credited to are inferences from the bank line and Dana's email.
- No export to PDF beyond browser print; no auth.

## To make it production-ready
Client data must live in an access-controlled store (per-client tenancy, encryption at rest, role-based access, SSO, audit log retention), not browser storage. Sending financial documents to a third-party LLM needs a data-processing agreement or a self-hosted/enterprise model. I would also need real packets from several clients to harden the parsers, the firm's chart-of-accounts and judgment policies, and their review/approval workflow.
