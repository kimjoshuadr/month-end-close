# Redesign: Guided Studio (direction C)

Chosen by Kim from three mockups (A editorial, B dark command center, C guided studio). Goal: award-level UI/UX. The current UI is generic (stock cards, pills, tables). Engine, parsing, store logic and tests must not change behavior; this is a presentation and interaction rewrite.

## Principles
- One decision at a time, with the consequence always visible: a persistent **Live Preview** panel (navy, rounded, elevated) shows adjusted net income, revenue, total assets, liabilities, equity, Dr=Cr and "balance sheet balances" check. When an answer or amount changes, changed figures animate (count-up over ~600ms, brief orange-to-blue highlight on the deltas, arrow showing the change vs. before).
- **Trace any number**: every figure on Entries and Statements is clickable and opens a right-hand drawer: the entry lines, source document excerpt (bank line / invoice / email / schedule row), the rule that produced it, and any flag. Entries show badges Booked / Assumed / Not booked.
- Honest-by-design visuals: assumed items show an orange marker; unresolved count is always visible; DRAFT state is explicit.
- Brand palette ONLY: navy #0B2240, blue #0099CE, orange #FF8A2C, text #3A3A3A/#4B4F58, plus tints derived from them (e.g. page #EEF1F5, paper #FFFFFF, success green only for "balanced/OK"). No Notion logo or name.
- Type: Poppins (headings, display numbers), Inter (UI/body), JetBrains Mono (tabular figures in tables and preview). All via next/font, no layout shift.
- No emoji. Custom inline SVG icon set (consistent 1.5px stroke). No stock component-library look: no default grey chips or generic cards. Bespoke buttons, segmented choice pills, step rail.

## Structure (still a single-page app)
Left **step rail** (navy): Packet read, Entries drafted, Your decisions (n of 7 badge), Statements. Each step has a state (done check / current / locked until packet loaded). Audit log and Ask AI move to header actions (slide-over drawers). Logo area: "Close Desk" wordmark + MONTH-END CLOSE eyebrow.
Main area per step, with Live Preview on the right (hidden on Statements where the paper takes the stage; on <1100px it becomes a sticky bottom summary bar that expands into a sheet).

1. **Packet**: hero drop zone with a drawn dashed outline and a clear primary action "Load sample packet". After load, a choreographed "reading" sequence: each file row resolves, then tie-outs tick in one by one (bank = TB cash, payroll = Gusto, materials, fuel, loan principal) with small check animations (respect reduced motion). Ends with a summary: "5 entries drafted, 3 items checked and left alone, 7 decisions for you" and a Continue button.
2. **Entries**: journal-style entries as stacked "ledger cards": title, status badge, debit/credit lines in a mono-aligned grid, source chips (click opens trace drawer), editable amounts with inline edit affordance and an "edited" marker plus reset. A "Checked, no entry" section explaining why Green Valley/Summit/Northline were left alone. Net income bridge as a horizontal waterfall (unadjusted 38,200 to adjusted 24,697.50), SVG, no chart library.
3. **Decisions**: one flag at a time (full-width question as headline, plain-language evidence panel with highlighted quotes, choice pills each showing its net income effect, "or tell me in your own words" input with a short chat transcript, Acknowledge for info items). Progress dots across the bottom; Back/Next. A final "All decisions made" state.
4. **Statements**: paper aesthetic: white page with generous margins, subtle shadow, centered header like the August PDF, tabs as a segmented control (Income month / YTD / Balance sheet / Cash flows). Whole-dollar figures, tabular mono numerals, clickable numbers (trace). DRAFT watermark/ribbon while unresolved > 0. Print stylesheet stays. "Mark as final" is a clear confirm action.

Also: Ask AI as a slide-over chat with suggested prompts and a clear disabled state; Audit log as a slide-over timeline.

## Motion (purposeful)
Count-up on key figures; delta highlight; step transitions (fade/translate 180ms); drawer/sheet spring; tie-out tick sequence; subtle hover/press states. All wrapped in `prefers-reduced-motion`.

## Constraints
- Must pass existing 46 tests untouched in behavior; add tests only for new logic (e.g. trace-source lookup).
- Responsive and verified by screenshot at 390, 820, 1440 for every step.
- Accessibility: contrast AA, visible focus rings (blue), keyboard-operable choice pills, drawers trap focus and close on Esc, aria-live announcement when net income changes.
- No new heavy dependencies (CSS + small helpers; framer-motion allowed only if it clearly pays off).
