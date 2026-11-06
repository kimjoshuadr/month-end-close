# Month-End Close Tool: Design

Date: 2026-11-06. Status: draft for approval.

## Intent and why

Kim is applying for the AI Consultant role at Notion CFO & Advisors. The practical exercise: build a working web tool that takes a month-end packet for a fictional client (Greenline Landscape Co., LLC, Sept 2026), drafts adjusting journal entries (AJEs), flags what the documents do not settle, lets the accountant answer and edit, and produces draft September financial statements in the format of the August example. It must be deployed as a link the reviewers can open.

They evaluate: correctness and balance of entries, accuracy of document reading and TB tie-out, handling of ambiguity, statement accuracy and format, automate-vs-human judgment, honesty about gaps, and practical AI use. They say: "a simple tool that works and is honest beats a complex one that overreaches." Kim wants the extra mile on look and assistant features, but correctness comes first.

First impression wanted: it looks like an enterprise tool/dashboard, within Notion CFO & Advisors branding.

## Goals

- Upload the three packet files (xlsx + 2 PDFs, plus the August statement PDF as the prior-period source) and get a first-draft AJE schedule.
- Every entry balances, uses only accounts in the trial balance, and cites its source per line.
- Show the net income effect of the entries.
- Open-items list: every item the documents don't settle or the tool assumed. Accountant answers via option buttons and/or a short typed exchange; entries update.
- Accountant can edit any entry amount directly; totals update.
- Generate: September income statement (month), YTD income statement, balance sheet, statement of cash flows, matching file 03's layout (prior-year comparatives, % of revenue, beginning balances from August). TTM page is optional; build it only if cheap.
- All statements recompute live when any entry or answer changes.
- AI assistant chat panel that knows the current entries/open items and can explain and answer questions.
- Dockerized, public GitHub repo, deployable on Coolify by Kim.

## Non-goals and anti-goals

- Not production-grade: no auth, no database, no multi-client. Client data lives in the browser session only. Say so in the README.
- Nothing is sent to a client. No email/export-to-client. Export of drafts (PDF/CSV) is optional.
- Anti-goal: silent guessing. Anti-goal: double-booking items already in the TB. Anti-goal: statements that don't balance or don't tie to August. Anti-goal: the AI inventing numbers (numbers come from deterministic code only).

## Decisions made by Kim

- Parsing is deterministic (fixed rules). The DeepSeek API is a fallback only when parsing fails (e.g. PDF layout not recognised). Key is supplied via the `DEEPSEEK_API_KEY` environment variable, server-side only, never in the repo or the browser. Kim pasted a key in chat; the repo must contain only `.env.example`, and the key should be rotated after submission.
- Policy for uncertainty (industry standard): book only what documents support; flag everything assumed. Refined after the builder check (my call, see below): there are two entry states. **Booked** (includes entries booked on a documented default, shown with an "assumed, unconfirmed" badge until the accountant answers) and **Not booked** (no support; flag only). Statements carry a "DRAFT, N unresolved items" banner with the net income swing of the alternative answers.
- Single-page tool with left-nav sections (Upload, Entries, Open items, Statements, Audit log) plus an "Ask AI" assistant. Layout B was chosen: navy left nav, sticky top bar with live net income, Dr=Cr check, and DRAFT badge.
- Branding from notioncfo.com: navy `#0B2240`, blue `#0099CE`, orange accent `#FF8A2C`, body text `#3A3A3A`/`#4B4F58`, light greys `#F5F5F5`/`#E5E5E5`. Headings Poppins, body Inter, uppercase eyebrow labels, logo at `samples/notion-logo.png` (from notioncfo.com). Tone: warm, plain-spoken, confident.
- Deploy: Docker image, Coolify (Kim deploys), public GitHub repo.
- Executor: Muse Spark 1.3 Contributor via OpenCode, orchestrated by Claude.

## Constraints

- Statement format must follow `samples/03_Example_...pdf` (page order, line items, "% of Revenue" columns, parenthesis negatives, "Fictional" footnote). Show month and YTD for 2026 vs 2025.
- Prior-year Sept 2025 month comes from the Sep-25 column of the August TTM page. YTD Sept 2025 = Aug YTD 2025 + Sep-25. YTD 2026 = Aug YTD + September. Beginning balances (cash $59,900, AR $36,900, prepaid, AP $25,690, loan $63,640, equity $116,670) come from the August balance sheet. August PDF figures can be hardcoded as a reference dataset in the repo (this is the prior-period source) but should also be parseable from the upload if cheap.
- Trial balance convention: balance sheet = as of 9/30; income statement accounts = September activity only; retained earnings includes prior months (RE + capital = 116,670 = August equity).
- Reviewer must be able to run the full demo with one click ("Load sample packet") as well as by uploading.

## Facts in the packet (my analysis; the tool must reproduce these)

Source files are in `samples/`. Unadjusted September net income = $38,200 (revenue 96,500; expenses 58,300).

### Entries to book automatically (supported)

| AJE | Entry | Amount | Source |
|---|---|---|---|
| Prepaid insurance | Dr 6160 Insurance Expense / Cr 1300 Prepaid Insurance | 1,800 | Prepaid schedule: Sep row "Recorded in GL? No" |
| Depreciation | Dr 6170 Depreciation Expense / Cr 1510 Accum. Depreciation | 2,400 | Fixed asset schedule (1,300 + 600 + 500) |
| Accrued payroll | Dr 6000 Wages 2,775; Dr 6010 Payroll Taxes 277.50 / Cr 2200 Accrued Payroll 3,052.50 | 3,052.50 | Payroll register: period Sep 26–Oct 9, paid 10/9; Sep 28, 29, 30 = 3 of 10 working days; wages 9,250 × 3/10; taxes 10% |
| Electric bill | Dr 6110 Utilities / Cr 2000 Accounts Payable | 1,250 | Lakeside Electric statement (service 9/1–9/30), client email says it was never sent. Bank shows 2,150 paid to City Water & Gas, which is already in Utilities, so Lakeside is separate |

### Items that must NOT be booked (the tool should show these as "checked, no entry")

- Green Valley GV-20931 ($6,820, dated 9/14): TB Materials 14,200 = Stone & Mulch 7,380 (bank) + 6,820, so it is already recorded.
- Summit Fuel SF-77412 ($2,140, dated 9/22): TB Fuel 4,300 = bank fuel card 2,160 + 2,140, so it is already recorded.
- Northline NL-3308 ($1,600): rental period 10/1–10/31, invoice dated 10/2. October expense, not September. Out of period.
- Other TB expense lines tie to bank (rent 5,200, subs 7,600, software 1,100, repairs 1,350, prof fees 750, bank fees 300). Payroll wages 18,500 and taxes 1,850 tie to Gusto 10,175 × 2 and the register. Loan: payment 2,640 = interest 1,000 + principal 1,640 (63,640 → 62,000). Bank ending balance 84,320 = TB cash.

### Open items (flag; do not guess silently)

1. **$5,000 transfer from account ****4471 on 9/12.** Email: owner Dana covered payroll from a personal account. Evidence is the bank line plus the email only. Customer deposits (70,400) cannot be tied to TB revenue (96,500, accrual basis with AR), so do NOT build a revenue-to-cash tie-out. 3100 Owner Contributions has no balance, so the $5,000 was most likely credited to revenue; state this as an assumption. Default proposal: owner contribution. Dr 4000 Landscape Services Revenue / Cr 3100 Owner Contributions 5,000. Options: capital contribution (default, booked as assumed), loan from owner (tool adds account 2600 Owner Loan, long-term liability, shown in financing inflow; my call), already correct as revenue (reverses the reclass, unlikely). Also needs confirming which revenue account it was credited to (assumed 4000).
2. **Accounts payable support.** TB AP is 18,450. Traceable invoices: Green Valley 6,820 + Summit Fuel 2,140 = 8,960. The remaining 9,490 has no support in the packet. No AJE; flag as unsupported, request AP subledger.
3. **August payroll cutoff.** The first pay period (Aug 29–Sep 11) includes Aug 31 (1 working day: 925 wages + 92.50 taxes) that was paid and expensed in September, while the August statements had no accrual. Default: Not booked (prior-period, immaterial, August already issued). Option "correct it": Dr 3900 Retained Earnings 1,017.50 / Cr 6000 Wages 925, Cr 6010 Payroll Taxes 92.50 (raises September net income by 1,017.50; my call).
4. **Accrual method assumption.** The 3/10 accrual assumes the register's rule (10 working days per period, holidays ignored; Labor Day 9/7 not treated specially). Record as an assumption.
5. **Revenue classification.** Customer deposits can't be mapped to Landscape vs Maintenance revenue from the bank statement. Assumption: TB revenue split is correct. Informational flag. A deposit pair from Oakmont HOA (12,400 and 9,800) may include prepayments; mention only if cheap.
6. **Owner distributions in September.** None appear in the bank; cash flow assumes zero (August had 20,000). Assumption.
7. **Northline rental** (informational): confirms October treatment; offer "accrue anyway" option for the accountant.

### Expected default results (acceptance test)

With open item 1 defaulted to owner contribution and others at default:

- Total AJEs: 1,800 + 2,400 + 3,052.50 + 1,250 + 5,000 (reclass). Net income impact from the first four: −8,502.50. Reclass takes 5,000 out of revenue.
- September revenue 91,500; adjusted **net income $24,697.50**; unadjusted 38,200.
- Balance sheet: Cash 84,320; AR 41,800; Prepaid 1,800; Fixed assets net 103,200; **Total assets 231,120**. AP 19,700; Accrued payroll 3,052.50; Equipment loan 62,000; total liabilities 84,752.50. Equity 146,367.50 (116,670 + 5,000 + 24,697.50). Total L&E 231,120.
- Cash flow, September: NI 24,697.50; depreciation 2,400; AR (4,900); prepaid 1,800; AP (5,990) (25,690 → 19,700); accrued payroll 3,052.50; operating 21,060. Financing: loan repayment (1,640), owner contribution 5,000, distributions 0 = 3,360. Net change 24,420; beginning cash 59,900; ending 84,320 (ties to bank).
- Changing the answer to open item 1 to "revenue" or "loan" must change statements accordingly, still balanced. Editing any AJE amount must recompute everything.
- The cash flow statement needs a line for owner contributions, which is not in the August format. Add it under financing and mention it as a deliberate format extension.

## Product shape

Left nav sections:
1. **Upload**: drop zone for the 4 files plus "Load sample packet". Shows extraction summary with tie-out checks (TB balances, bank end balance vs TB cash, payroll vs bank, expenses vs bank lines).
2. **Entries**: AJE table (number, date, account #/name, debit, credit, source citation, status Booked/Proposed/Excluded). Inline editable amounts. Per-entry Dr=Cr check. Net income bridge (unadjusted → adjusted). "Checked, no entry needed" list.
3. **Open items**: cards with context, evidence, suggested default, option buttons, a short typed reply box (DeepSeek maps free text to an option or amount when a key is configured; otherwise buttons only), and the net income effect of each option.
4. **Statements**: tabs for Income Statement (month), Income Statement (YTD), Balance Sheet, Cash Flows, optional TTM. Rendered in the August format. Pending items show a draft banner. Accountant can edit before finalising; "Mark as final" is a local state toggle only. Print/PDF via browser print CSS is enough.
5. **Audit log**: every parse, assumption, answer, and manual edit with timestamps.
- Sticky top bar: client/period, adjusted net income, Dr=Cr indicator, open item count, DRAFT badge.
- **Ask AI** drawer: chat with DeepSeek given the current entries/open items/source excerpts. It explains, cites, and suggests; it never changes numbers itself, and it must say when unsure. Works only if the key is set; otherwise shows a disabled state with a clear message.

Responsive: must look right at mobile, tablet, and desktop widths (screenshot all three before declaring done).

## Calls made after the builder check (mine, for Kim to check)

- Entry states: Booked (default-assumed items are booked and badged) vs Not booked. This replaces my earlier chat description where ambiguous items stayed out of statements; it matches the acceptance numbers and avoids leaving a likely-owner-money $5,000 in revenue. Unsupported items (AP 9,490, Aug cutoff, Northline) are never booked unless the accountant chooses.
- Informational flags (items 2, 4, 5, 6, 7) count as open until the accountant clicks Acknowledge. The "N unresolved" count and DRAFT badge use that.
- A typed reply can pick an option and/or set a custom amount (via DeepSeek if available; otherwise option buttons and an amount field). It logs as a manual edit in the audit log.
- Northline "accrue anyway": Dr 6100 Rent (closest TB account for equipment rental; flag the mapping) / Cr 2000 Accounts Payable, 1,600.
- Comparatives follow the August PDF exactly: balance sheet is a single column (Sep 30, 2026) with no prior-year column; cash flow has Month and Year-to-Date columns; income statements have 2026 and 2025 with % of revenue. Add an "Owner Contributions" line under financing in the cash flow.

## Left to the builder

Tech stack within these bounds (my call: Next.js + TypeScript, single Docker container, server routes for file parsing and DeepSeek proxy, no database, state in the browser, `xlsx` and a PDF text library for parsing). A single pure calculation module (entries → adjusted TB → statements) with unit tests covering the acceptance numbers above. Chart or visual extras only if they don't threaten correctness. Dockerfile, `.env.example`, README with run/deploy-on-Coolify steps. Code comments in one line, no extra abstractions.

## Deliverables beyond the tool

A `docs/` or README section drafting what Kim sends back: how it works, what's automated vs. needs the accountant, how AI was used to build it (orchestrator + executor), challenges, what wasn't finished, and what is needed for production (where client data should live, who gets access, auth/SSO, audit trail, SOC2-ish hosting, no client data to third-party LLMs without agreement).

## Risks to be honest about

- PDF layout parsing is tuned to this packet; other packets may fall back to DeepSeek or fail.
- The $5,000 treatment and the revenue account it was credited to are inferred.
- Statement formatting is replicated by hand, not pixel-matched to the PDF.
- DeepSeek is a third-party API; fictional data only in this demo.
