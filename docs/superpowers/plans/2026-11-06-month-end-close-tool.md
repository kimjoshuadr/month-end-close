# Month-End Close Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dockerized web tool that reads the Greenline Sept-2026 packet, drafts balanced AJEs with sources, flags unsettled items, lets the accountant answer/edit, and regenerates Sept-2026 statements in the August PDF format.

**Architecture:** Next.js (App Router, TypeScript) in one container. Parsing and DeepSeek calls happen in server routes; ALL accounting math lives in a pure module `lib/engine/*` (no React, no I/O) so it is unit-testable. Browser holds state (packet, answers, overrides, audit log) in a React context; statements are derived from state on every render. No database.

**Tech Stack:** Next.js, TypeScript, Tailwind (or plain CSS modules), `xlsx` (SheetJS) for workbook, `unpdf` or `pdfjs-dist` for PDF text, Vitest, Docker.

**Spec:** `docs/superpowers/specs/2026-11-06-month-end-close-tool-design.md` (read it first; the acceptance numbers there are the source of truth). Sample inputs: `samples/`.

## Global Constraints

- Entries must balance, use only TB account numbers (exception: 2600 Owner Loan, added only when that answer is chosen), and cite a source on every line.
- Numbers come only from deterministic code. DeepSeek (`DEEPSEEK_API_KEY`, server-side only, model `deepseek-chat`, base `https://api.deepseek.com`) is used for: parse fallback, mapping typed replies to an option/amount, and the Ask AI chat. Never commit a key; ship `.env.example`.
- Two entry states only: `booked` (may carry `assumed: true` badge) and `not_booked`.
- Brand: navy `#0B2240`, blue `#0099CE`, orange `#FF8A2C`, text `#3A3A3A` / `#4B4F58`, greys `#F5F5F5` / `#E5E5E5`; Poppins headings, Inter body (self-host or `next/font`); uppercase eyebrow labels; logo `samples/notion-logo.png` copied to `public/`.
- Layout B: navy left nav (Upload, Entries, Open items [badge], Statements, Audit log, Ask AI), sticky top bar (client/period, adjusted net income, Dr=Cr indicator, unresolved count, DRAFT badge).
- Statement format follows `samples/03_Example_...pdf`: BS single column; cash flow Month + YTD columns; income statements 2026 vs 2025 with % of revenue; parentheses for negatives; "Fictional" footnote.
- Must look right at mobile, tablet and desktop widths.
- Nothing is sent to any client. No persistence of client data server-side.

## Review Focus

- User uploads files in a different order / only some files: show which are missing and block generation, not crash.
- Same file uploaded twice or a non-packet file: reject with a clear message.
- Accountant sets an entry amount to 0, blank, negative or non-numeric: reject or treat as 0 without NaN in totals.
- Accountant answers an open item, then changes the answer back: statements return exactly to the earlier values.
- Entry edited so Dr != Cr: show an unbalanced warning, and the BS must visibly flag out-of-balance rather than silently plug.
- DeepSeek key missing / API error / timeout: tool still fully works with buttons; chat shows a clear disabled state.
- Prior-year (2025) figures: Sept YTD 2025 = Aug YTD 2025 + Sep-25 TTM column.

---

## File Structure

- `lib/types.ts`: shared types (below).
- `lib/reference/august.ts`: Aug-2026 statement figures + Sep-25 month figures as typed constants (from the August PDF).
- `lib/parse/workbook.ts`, `lib/parse/pdfs.ts`, `lib/parse/fallback.ts`: packet parsing.
- `lib/engine/proposal.ts`: packet + answers -> AJEs, flags, checked-items, tie-outs.
- `lib/engine/statements.ts`: adjusted TB -> four statements.
- `lib/engine/index.ts`: `compute(packet, answers, overrides)` glue.
- `app/api/parse/route.ts`, `app/api/reply/route.ts`, `app/api/chat/route.ts`: server routes.
- `app/(app)/*` and `components/*`: UI. `state/store.tsx`: context.
- `tests/*.test.ts`, `Dockerfile`, `.env.example`, `README.md`, `docs/SUBMISSION.md`.

### Shared types (Task 2 defines; all tasks use these exact names)

```ts
export type TbRow = { no: number; name: string; debit: number; credit: number };
export type BankLine = { date: string; description: string; withdrawal: number; deposit: number; balance: number };
export type Invoice = { vendor: string; number: string; date: string; due?: string; periodNote?: string; total: number; lines: { desc: string; amount: number }[] };
export type Packet = {
  tb: TbRow[];
  payroll: { periods: { label: string; gross: number; taxes: number }[]; nextPeriod: { start: string; end: string; payDate: string }; taxRate: number; grossPerPeriod: number };
  prepaid: { monthlyAmort: number; rows: { month: string; amort: number; recorded: string }[]; assetAcct: 1300; expenseAcct: 6160 };
  assets: { monthlyDep: number; assetAcct: 1500; accumAcct: 1510; expenseAcct: 6170 };
  bank: { begin: number; end: number; lines: BankLine[] };
  invoices: Invoice[];
  email: { from: string; date: string; body: string };
};
export type AjeLine = { acct: number; debit: number; credit: number; source: string };
export type Aje = { id: string; title: string; status: 'booked' | 'not_booked'; assumed: boolean; flagId?: string; lines: AjeLine[] };
export type FlagOption = { id: string; label: string };
export type Flag = { id: string; title: string; evidence: string; kind: 'decision' | 'info'; options: FlagOption[]; defaultOption: string };
export type Answer = { option?: string; amount?: number; ack?: boolean };
export type Answers = Record<string, Answer>;
export type Overrides = Record<string, number>; // key `${ajeId}:${lineIndex}` -> new amount (applies to whichever side is non-zero)
export type Checked = { title: string; reason: string };
export type Tie = { label: string; expected: number; actual: number; ok: boolean };
export type Proposal = { ajes: Aje[]; flags: Flag[]; checked: Checked[]; ties: Tie[] };
export type Computed = { proposal: Proposal; adjTb: TbRow[]; netIncomeUnadj: number; netIncomeAdj: number; balanced: boolean; statements: Statements; unresolved: number };
```
`Statements` is defined in Task 5.

Flag ids (fixed): `owner-transfer`, `ap-support`, `aug-cutoff`, `payroll-method`, `revenue-class`, `distributions`, `northline`. AJE ids (fixed): `prepaid`, `depreciation`, `payroll-accrual`, `electric`, `owner-transfer`, `aug-cutoff`, `northline`.

---

### Task 1: Scaffold, brand shell, Docker

**Files:** Create Next.js app root files, `Dockerfile`, `.dockerignore`, `.env.example`, `app/layout.tsx`, `components/Shell.tsx`, `public/notion-logo.png`.

**Interfaces:** Produces `<Shell>` (left nav, sticky top bar slots, content area) used by every page.

- [ ] **Step 1:** Scaffold Next.js + TS + Vitest in the repo root (keep existing `docs/`, `samples/`, `.gitignore`). Set `output: 'standalone'` in `next.config`.
- [ ] **Step 2:** Implement `Shell` with brand tokens as CSS variables; nav items routes: `/` Upload, `/entries`, `/open-items`, `/statements`, `/audit`; "Ask AI" toggles a right drawer (placeholder). On mobile the nav collapses to a top menu.
- [ ] **Step 3:** Multi-stage `Dockerfile` (node LTS alpine, standalone output, `PORT` 3000, runs as non-root). `.env.example` contains `DEEPSEEK_API_KEY=`.
- [ ] **Step 4:** Verify: `npm run build` passes; `docker build -t greenline .` passes; `docker run -p 3000:3000 greenline` serves the shell.
- [ ] **Step 5:** Commit `feat: scaffold shell and docker`.

### Task 2: Types and August reference data

**Files:** Create `lib/types.ts`, `lib/reference/august.ts`, `tests/reference.test.ts`.

**Interfaces:** Produces the types above and `AUG` constant: `{ is: { month: IsFigures; ytd: IsFigures; month2025: IsFigures; ytd2025: IsFigures }, bs: {...}, cf: { cashBegin: number; ... }, sep2025: IsFigures, ttm?: ... }` where `IsFigures = Record<IsLine, number>` and `IsLine` = the line names in the August income statement (`Landscape Services Revenue`, `Maintenance Contract Revenue`, `Wages`, `Materials`, `Subcontractors`, `Rent`, `Fuel`, `Utilities`, `Repairs & Maintenance`, `Payroll Taxes`, `Insurance`, `Software & Subscriptions`, `Professional Fees`, `Bank Fees`, `Depreciation`, `Interest Expense`).

- [ ] **Step 1:** Failing test: `AUG.is.ytd` net income (sum revenue minus all expense lines) equals 185,247; `AUG.is.ytd2025` equals 158,720; `AUG.sep2025` net income equals 19,083; Aug BS total assets 206,000.
- [ ] **Step 2:** Run, see fail. **Step 3:** Transcribe figures from `samples/03_Example...pdf` (Aug month, Aug YTD, 2025 comparatives, Sep-25 column of the TTM page, Aug balance sheet, Aug cash flow YTD column incl. YTD distributions 169,900 and loan repayments 12,350, YTD AR/prepaid/AP changes). **Step 4:** Tests pass. **Step 5:** Commit.

### Task 3: Packet parsing

**Files:** Create `lib/parse/workbook.ts`, `lib/parse/pdfs.ts`, `lib/parse/fallback.ts`, `app/api/parse/route.ts`, `tests/parse.test.ts`.

**Interfaces:** Produces `parseWorkbook(buf: ArrayBuffer): Pick<Packet,'tb'|'payroll'|'prepaid'|'assets'>`; `parseSupportingPdf(buf: ArrayBuffer): Promise<Pick<Packet,'bank'|'invoices'|'email'>>`; `classifyFile(name: string, firstText: string): 'workbook'|'support'|'august'|'unknown'`; route `POST /api/parse` (multipart) returns `{ packet?: Packet; missing: string[]; errors: string[]; usedFallback: boolean }`. `fallback.ts`: `deepseekExtract(text: string, schemaHint: string): Promise<unknown>`, used only when deterministic parsing throws or sums don't tie.

- [ ] **Step 1:** Failing tests reading the files in `samples/`: TB has 28 rows and debits = credits = 332,020; payroll `grossPerPeriod` 9,250, `taxRate` 0.1; prepaid Sep row `recorded` is `No`; bank has 19 activity lines, `end` 84,320; 5 invoices incl. Lakeside total 1,250 and Northline date `10/02/2026`; email body contains "$5k".
- [ ] **Step 2:** Run, see fail. **Step 3:** Implement with deterministic text rules (regex on statement rows / "Total due"). Validate invoice line sums equal totals and bank running balance reaches `end`; on failure use fallback; on no key, return an error naming the file.
- [ ] **Step 4:** Tests pass, plus a test that a non-packet file returns `classifyFile` = `unknown` and route reports it. **Step 5:** Commit.

### Task 4: Proposal engine (AJEs, flags, tie-outs)

**Files:** Create `lib/engine/proposal.ts`, `tests/proposal.test.ts`.

**Interfaces:** Consumes `Packet`, `Answers`. Produces `buildProposal(packet: Packet, answers: Answers): Proposal`. Defaults per spec: `owner-transfer` option ids `contribution` (default), `loan`, `revenue`; `aug-cutoff` options `skip` (default), `correct`; `northline` options `skip` (default), `accrue`; flags `ap-support`, `payroll-method`, `revenue-class`, `distributions` are `kind: 'info'` (option id `ack` only).

- [ ] **Step 1:** Failing tests (load packet via Task 3 parsers) with default answers `{}`:
  - AJE `prepaid` lines: Dr 6160 1,800 / Cr 1300 1,800; `depreciation`: Dr 6170 2,400 / Cr 1510 2,400; `payroll-accrual`: Dr 6000 2,775, Dr 6010 277.5, Cr 2200 3,052.5; `electric`: Dr 6110 1,250 / Cr 2000; `owner-transfer` (booked, assumed): Dr 4000 5,000 / Cr 3100 5,000.
  - Every booked AJE balances; every line has a non-empty `source`; every acct exists in the TB.
  - `checked` contains Green Valley (already in Materials), Summit Fuel (already in Fuel), Northline (October period).
  - `ties`: bank end vs TB cash 84,320 OK; payroll bank 10,175 x2 OK; materials 14,200 = 7,380 + 6,820 OK; fuel 4,300 = 2,160 + 2,140 OK; loan principal 1,640 OK.
  - Answer `owner-transfer: loan` gives Dr 4000 / Cr 2600 with acct 2600 present; `revenue` makes the AJE `not_booked`.
  - `aug-cutoff: correct` books Dr 3900 1,017.5 / Cr 6000 925 / Cr 6010 92.5. `northline: accrue` books Dr 6100 1,600 / Cr 2000.
  - The Green Valley/Summit "already recorded" logic must be derived by matching TB expense vs bank + invoices, not hardcoded to these numbers.
- [ ] **Step 2:** Run, see fail. **Step 3:** Implement. Payroll accrual: working days in next period that fall in the month / 10 x gross per period (Mon-Fri counting from period start). **Step 4:** Pass. **Step 5:** Commit.

### Task 5: Statement engine and `compute`

**Files:** Create `lib/engine/statements.ts`, `lib/engine/index.ts`, `tests/statements.test.ts`.

**Interfaces:** Consumes `AUG`, `Packet`, booked `Aje[]`. Produces `applyOverrides(ajes: Aje[], o: Overrides): Aje[]`, `adjustedTb(tb: TbRow[], ajes: Aje[]): TbRow[]`, `buildStatements(packet: Packet, ajes: Aje[]): Statements` with `Statements = { isMonth: IsTable; isYtd: IsTable; bs: BsTable; cf: CfTable }` (tables are arrays of `{ label; values: number[]; kind: 'line'|'subtotal'|'total'|'header' }` plus column headers; the builder defines exact row structures to mirror the August PDF), and `compute(packet: Packet, answers: Answers, overrides: Overrides): Computed`.

- [ ] **Step 1:** Failing tests with default answers: net income unadjusted 38,200; adjusted 24,697.5; Sept revenue 91,500; BS total assets 231,120, AP 19,700, accrued payroll 3,052.5, total liabilities 84,752.5, equity 146,367.5, `balanced` true; CF: operating 21,060, financing 3,360, net change 24,420, ending cash 84,320; YTD net income 185,247 + 24,697.5; YTD revenue 2025 = Aug YTD 2025 + Sep-25; `unresolved` = 7 (all seven flags unanswered/unacknowledged); after answering or acknowledging one, 6.
- [ ] **Step 2:** Further tests: answer `owner-transfer: revenue` gives NI 29,697.5 and still balances; setting `overrides['electric:0']=2000` changes NI by -750; override to 0/NaN does not produce NaN totals; unbalanced override sets `balanced` false.
- [ ] **Step 3:** Run, see fail. **Step 4:** Implement. YTD = Aug YTD figures + September adjusted figures; Depreciation and Interest shown as "Other expenses" like the PDF; Insurance line from 6160. **Step 5:** Pass. **Step 6:** Commit.

### Task 6: State, Upload page, Entries page, top bar

**Files:** Create `state/store.tsx`, `app/page.tsx`, `app/entries/page.tsx`, `components/TopBar.tsx`, `components/AjeTable.tsx`.

**Interfaces:** Consumes `compute`. Produces `useStore(): { packet; answers; overrides; audit; computed; loadSample(); upload(files: File[]); setAnswer(id, a); setOverride(key, n); log(msg) }`; sample packet served from `public/samples/` (copy the 3 inputs there).

- [ ] **Step 1:** Failing test (Vitest + component or logic-level): store `setOverride` then `computed.netIncomeAdj` changes; `setAnswer` back to default restores the original value.
- [ ] **Step 2:** Implement store + pages: Upload (drop zone, "Load sample packet", per-file status, missing-file messages, tie-out checks list with OK/not OK); Entries (AJE cards/table with status and "assumed" badge, inline editable amounts, per-entry Dr=Cr check, NI bridge, "Checked, no entry needed" list); TopBar shows live values.
- [ ] **Step 3:** Verify in browser: load sample, edit an amount, top bar updates. **Step 4:** Commit.

### Task 7: Open items, typed replies, audit log

**Files:** Create `app/open-items/page.tsx`, `app/audit/page.tsx`, `components/FlagCard.tsx`, `app/api/reply/route.ts`, `tests/reply.test.ts`.

**Interfaces:** `POST /api/reply` body `{ flagId; text; options: FlagOption[] }` returns `{ option?: string; amount?: number; explanation: string }`. Deterministic keyword mapping first (e.g. "loan" -> `loan`, "contribut|capital|personal" -> `contribution`, "revenue|income" -> `revenue`, a number -> `amount`); DeepSeek only when keywords don't resolve; no key -> `{ explanation: 'Pick an option above.' }`.

- [ ] **Step 1:** Failing test for the keyword mapper (pure function `mapReply`): "it was a loan" -> `loan`; "owner capital, personal funds" -> `contribution`; "treat as revenue" -> `revenue`; "use 4,500" -> amount 4500.
- [ ] **Step 2:** Implement flag cards: evidence, options with NI effect of each (compute by running `compute` per option), typed reply box with a short exchange transcript per card, Acknowledge for info flags. Every answer/edit appends to the audit log with timestamp.
- [ ] **Step 3:** Verify in browser: change owner-transfer to Loan, then Revenue, then back to Contribution; top bar NI returns to 24,697.50. **Step 4:** Commit.

### Task 8: Statements page

**Files:** Create `app/statements/page.tsx`, `components/StatementTable.tsx`, print CSS.

- [ ] **Step 1:** Render Income Statement (month), Income Statement (YTD), Balance Sheet, Cash Flows from `computed.statements` in tabs, matching the August PDF's structure (company/title/period header, `% of Revenue` columns, `$` on totals, footnote). DRAFT banner with unresolved count and NI swing; editable cells are NOT required here, but each statement links back to its source entry. "Mark as final" local toggle only; print-to-PDF via CSS.
- [ ] **Step 2:** Verify in browser: statements equal the acceptance numbers; changing an entry or answer refreshes them. **Step 3:** Commit.

### Task 9: Ask AI drawer

**Files:** Create `app/api/chat/route.ts`, `components/ChatDrawer.tsx`.

- [ ] **Step 1:** `POST /api/chat` takes `{ messages; context }` where `context` is a compact JSON of current entries, flags, ties and statement totals; system prompt: explain and cite, never invent numbers, say when unsure, cannot change entries. Calls DeepSeek; no key -> 503 with message; timeout 20s.
- [ ] **Step 2:** Drawer UI with suggested prompts ("Why wasn't Green Valley booked?"). **Step 3:** Verify with and without a key. **Step 4:** Commit.

### Task 10: Docs, GitHub, final QA

**Files:** Create `README.md`, `docs/SUBMISSION.md`.

- [ ] **Step 1:** README: run locally, Docker, Coolify steps (Dockerfile build, env var `DEEPSEEK_API_KEY`, port 3000), limits. `docs/SUBMISSION.md`: draft of the four write-ups (how it works, automated vs human, how AI was used incl. orchestrator + Muse executor, challenges/not finished/production needs). Be honest about parsing being tuned to this packet and the $5,000 inference.
- [ ] **Step 2:** `npm test` all green; `docker build` + run; screenshots of every page at mobile (390px), tablet (820px), desktop (1440px) saved to `docs/screenshots/`.
- [ ] **Step 3:** Orchestrator (not executor) creates the public GitHub repo and pushes, after confirming `gh auth status`; verify `git log -p` / grep contains no API key.
