# Redesign v2: ERP console (supersedes the Guided Studio spec)

Kim rejected "guided studio". Wanted: a simple, enterprise tool of the kind ERPs ship (NetSuite / Sage Intacct feel). Replace the UI entirely. Keep lib/, state/ logic and all tests. The main objective stays the task: upload packet, review drafted AJEs, resolve flagged items, see statements update live. Nothing decorative that gets in the way of that flow.

## Look and feel
- Flat, dense, neutral. Light canvas (#F3F5F8), white panels, 1px #D5DBE3 borders, 3-4px radius, almost no shadows. Base text 13px Inter; tabular numerals (Inter tnum or JetBrains Mono) for every figure; right-aligned amounts; negatives in parentheses.
- Brand palette only: navy #0B2240 (app bar), blue #0099CE (links, primary buttons, selection), orange #FF8A2C (Draft/warning/unresolved), text #3A3A3A. Success green only for "balanced/OK", red only for out-of-balance. No Notion name or logo, no emoji, small consistent inline SVG icons.
- Motion: minimal. Only a brief highlight on cells whose values changed after an edit or answer, and a short count transition on the summary strip. Respect prefers-reduced-motion.

## Shell
1. **App bar** (navy, 48px): wordmark "Close Desk", global search box (filters entries, flags, accounts), entity switcher showing "Greenline Landscape Co., LLC", period "Sep 2026", Ask AI button, avatar placeholder ("Accountant").
2. **Module tabs** under it: Close Packet | Journal Entries | Open Items (count badge) | Financial Statements | Audit Trail. Active tab has a blue underline.
3. **Page header**: breadcrumb (Close / Sep 2026 / <page>), page title, status lozenge (DRAFT or FINAL), and an **action toolbar** of plain buttons (e.g. Load sample, Reset session, Print, Mark as final).
4. **Close summary strip** under the header on every page (a compact KPI row like an ERP "portlet"): Unadjusted NI | Adjustments | Adjusted NI | Dr = Cr (difference 0.00, green) | Unresolved items n | Entries booked n. Updates live.

## Pages
- **Close Packet**: two upload rows in a form-like panel (Workbook .xlsx, Supporting PDF) with drag/drop or Browse, per-file status; "Load sample packet" as a primary button. Below, a "Validation and tie-outs" grid (Check, Expected, Actual, Difference, Status icon). No theatrics.
- **Journal Entries**: a list view grid: Entry #, Title, Status (Booked / Assumed / Not booked), Debit total, Credit total, Source, Flag. Filters row (status). Click or expand a row to open the entry record panel: header fields (Entry #, Date 9/30/2026, Memo, Status) and a lines grid (Account no. and name, Debit, Credit, Source document with link that opens the drill-down panel). Debit/credit cells are inline editable (edited cells show a small marker, Reset). Footer totals row with Dr = Cr indicator. Below the list, a "Checked, no entry needed" grid (Item, Reason). Include a small net income bridge table (Unadjusted, each entry, Adjusted); an optional slim SVG bar is fine but not required.
- **Open Items**: a worklist: top grid of the 7 flags (Item, Type, Amount at stake, Status Unresolved/Answered/Acknowledged, Default). Selecting a row opens a detail form beneath/beside: Description, Evidence (bullets with source), radio group of options with the net income effect next to each, a Comments/reply box with a short transcript (typed reply handled as now), Save answer button. After saving, the strip and all grids update with changed-cell highlight.
- **Financial Statements**: report viewer: left list of reports (Income Statement month, YTD, Balance Sheet, Cash Flows) or tabs; toolbar (Print/PDF, Mark as final); report rendered on a plain white page in the August PDF format. Whole dollars. Every figure is a link that opens a drill-down side panel (entries and source behind it). Draft banner when unresolved > 0.
- **Audit Trail**: a plain grid (Time, User, Action, Detail), filterable.
- **Ask AI**: right slide-over panel, as now.

## Constraints
- Keyboard accessible, visible focus ring, AA contrast, tables with proper th/scope.
- Responsive: desktop is primary. At 820px the module tabs scroll horizontally and grids scroll within their panel; at 390px the summary strip scrolls horizontally, the entry detail stacks, and statements drop % columns. Screenshot every page at 390, 820, 1440.
- Remove unused studio components and CSS. Keep tests green (46+), keep `npm run build` green.
