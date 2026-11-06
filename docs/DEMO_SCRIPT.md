# Walkthrough script: Month-End Close (about 7 minutes)

**Links:** [Live tool](https://month-end-close.vercel.app) · [Code](https://github.com/kimjoshuadr/month-end-close) · [Sample packet files](https://github.com/kimjoshuadr/month-end-close/tree/main/samples) · [Write-up](https://github.com/kimjoshuadr/month-end-close/blob/main/docs/SUBMISSION.md)

**How to read this script:** **Bold** = click or press. *Italics* = point at it with the cursor. > Quotes = say it. `Code` = type or paste exactly this. Every step is listed; nothing is left to improvise.

## Before you hit record

1. Download the three files from [samples/](https://github.com/kimjoshuadr/month-end-close/tree/main/samples) into one Finder folder:
   - `01_Month_End_Workbook_Sep2026 (1).xlsx`
   - `02_Supporting_Documents_Sep2026 (1).pdf`
   - `03_Example_Financial_Statements_Aug2026 (1).pdf`
2. Open https://month-end-close.vercel.app in Chrome at full width (1440px or wider), zoom 100%.
3. If anything is loaded, click **Reset session** (top right of Close Packet) → **OK**. The strip should be empty and Open Items should have no badge.
4. Put the Finder window on the right half of the screen so you can drag from it.
5. Keep this script open on a second screen. Section 7 has six explanations to paste, so copy them from here when you get there.

---

## 1. Intro (0:00–0:20)

*Close Packet tab, empty.*

> "Hi, I'm Kim. This is Month-End Close, the tool I built for the Greenline Landscape September close. It reads the month-end packet, drafts the adjusting entries with a source on every line, flags what the documents don't settle, and produces the September statements in your August format. The accountant makes the judgment calls, and everything updates live."

## 2. Upload and tie-outs (0:20–1:05)

1. Drag `01_Month_End_Workbook_Sep2026 (1).xlsx` onto **Drop file or Browse** in the **Workbook** row.

   *Point at the blue message and the "Received" label.*

   > "I'll start with the workbook: the trial balance, payroll register, and the prepaid and fixed-asset schedules. It holds it and tells me what it still needs."

2. Select `02_Supporting_Documents_Sep2026 (1).pdf` and `03_Example_Financial_Statements_Aug2026 (1).pdf` together and drag both onto the **Supporting PDF** row.

   > "Now the supporting PDF, with the bank statement, the vendor invoices and Dana's email, plus last month's statements."

3. *Point down the **Validation and tie-outs** grid, row by row.*

   > "Before drafting anything, it ties the documents to the trial balance. The bank ending balance matches cash at 84,320. The two Gusto payroll debits match the register. Materials and Fuel tie exactly to the bank payments plus the Green Valley and Summit invoices, which is how it knows those two invoices are already booked. And the loan principal of 1,640 matches the drop in the loan balance."

4. *Point at the summary strip.*

   > "This strip stays on every page: 38,200 unadjusted, 24,697.50 adjusted, debits equal credits, and seven items open."

## 3. Journal entries (1:05–2:00)

1. Click **Journal Entries**.
2. Click the **›** arrow on **AJE-003** to expand it.

   > "Five drafted entries. Prepaid insurance, 1,800, from the schedule, which shows September wasn't recorded. Depreciation, 2,400, from the fixed-asset schedule. And the payroll accrual, 3,052.50: the next pay period starts September 26, so the 28th to the 30th is 3 of 10 working days, plus 10% employer tax."

3. *Point at the **Source document** column, then the **Auto-reverse 10/01/2026** badge.*

   > "Every line cites its source document, and the accrual is set to auto-reverse on October 1, like it would in an ERP."

4. Click the **›** on **AJE-003** again to collapse it. *Point at **AJE-004**.*

   > "The Lakeside electric bill, 1,250, is September service that was never recorded; Dana's email confirms it never reached us."

5. *Point at the orange **Assumed** badge on **AJE-005**.*

   > "AJE-005 moves the 5,000 transfer out of revenue. It's marked Assumed because it's a judgment call; I'll come back to it."

6. Scroll down to **Net income bridge**, then **Checked, no entry needed**.

   > "The bridge shows each entry's effect, from 38,200 down to 24,697.50. And here's what it deliberately did not book: Green Valley and Summit are already in the trial balance, and the Northline rental is for October, so it's out of period."

## 4. Edit a value, catch an imbalance, undo (2:00–2:35)

1. Scroll back up and click the **›** on **AJE-004**.
2. Click the **Debit** amount on line **6110 Utilities**, type `2000`, press **Enter**.

   *Point at the red **Unbalanced** label in the entry's Totals row, then the red Dr = Cr box in the strip.*

   > "Any amount can be edited. If I change only the debit, it immediately flags the entry as out of balance by 750."

3. Click the **Credit** amount on line **2000 Accounts Payable**, type `2000`, press **Enter**.

   *Point at the strip.*

   > "Fix the credit, and it balances again. Net income drops by 750 straight away."

4. Click an empty part of the page (so the keyboard isn't in a cell), then press **⌘Z** twice.

   *Point at the strip: back to $24,697.50, Dr = Cr 0.00.*

   > "Every change can be undone. That's two undos, and we're back to 24,697.50."

## 5. Open items (2:35–3:50)

1. Click **Open Items**. The **$5,000 transfer from \*\*\*\*4471 on 9/12** item is selected automatically.

   > "This is the worklist: everything the documents don't settle. Nothing is guessed silently. First, the 5,000 transfer on September 12. The bank shows it came from account 4471, and Dana says it was her own money covering payroll. Each option shows what it does to net income."

2. Click in the **Comments / Reply** box, type `it was a loan from Dana`, press **Enter**.

   *Point at the reply, then at the $5,000 row now showing Answered.*

   > "I can just type an answer. It reads that as a loan. A loan needs account 2600, which isn't in the trial balance, so it's labeled as requiring approval instead of being added quietly. It saves and moves on."

3. Click the **$5,000 transfer from \*\*\*\*4471 on 9/12** row again. Select **Capital contribution (default)**, then click **Save answer**.

   > "Dana's email says she moved her own money in, so I'll record it as a capital contribution instead. It saves and moves to the next item."

4. On **Accounts payable support**, select **Acknowledge (default)**, then click **Save answer**.

   > "Payables are 18,450, but only 8,960 is supported by invoices in the packet. The other 9,490 can't be booked or cleared from these documents, so I'm acknowledging it as a request for the AP subledger."

5. Click an empty part of the page, then press **?**. *Show the shortcuts list.* Press **Esc**.

   > "Power users can work from the keyboard. Here's the list."

6. For each of the next five items, press **1**, then **Enter**. It moves on by itself after each one.
   - **August payroll cutoff (Aug 31 in Period 1)**: 1 = *Leave as is (default)*
   - **Accrual method assumption**: 1 = *Acknowledge (default)*
   - **Revenue classification**: 1 = *Acknowledge (default)*
   - **Owner distributions in September**: 1 = *Acknowledge (default)*
   - **Northline rental (October)**: 1 = *Leave in October (default)*

   > "The August payroll day is small and August is already issued, so I'll leave it. The accrual method and revenue split are acknowledged, there were no owner distributions, and the rental stays in October."

7. *Point at "All items resolved" and the Open Items badge, which is gone.*

   > "All seven resolved."

## 6. Statements (3:50–4:50)

1. Click **Financial Statements**.
2. Click **Cover**.

   > "The September package, in the same format as your August one."

3. Click **Income Statement — month**.

   > "September against last September, with percent of revenue. Prior-year numbers and opening balances come from the August package, so everything ties."

4. Click the **Utilities** figure in the 2026 column. *Point at the drill-down panel.* Press **Esc**.

   > "Every number drills down. Utilities shows the Lakeside entry and the City Water bank line behind it."

5. Click **Income Statement — YTD**.

   > "Year to date."

6. Click **Balance Sheet**. *Point at total assets.*

   > "Total assets 231,120, and it balances."

7. Click **Cash Flows**. *Point at Cash at End of Period.*

   > "The cash flow ends at 84,320, exactly the bank balance."

8. Click **Trailing Twelve Months**.

   > "And the trailing twelve months."

## 7. Flux review (4:50–5:50)

1. Click **Flux Review**. *Point at the six highlighted lines.*

   > "Like a real close, it reviews the movements: every line against August and against last September. Six lines moved by at least 1,000 dollars and 10 percent, and each one needs an explanation before the package can be finalized."

2. Paste each explanation into the **Explanation** box on its line (the box saves when you click out of it). If a "saved" notice in the bottom-right covers a box, click its **×**. Say the Materials and Wages lines out loud as you paste; paste the rest quietly.

| Line | Paste this |
|---|---|
| **Landscape Services Revenue** | `Up 18% on Sep 2025 and 4% on Aug; in line with the 2026 trend (YTD +11%). The $5,000 owner transfer was removed (AJE-005).` |
| **Maintenance Contract Revenue** | `Up 13% on Sep 2025 but flat to Aug ($24,500); contract billing has run $24-25k a month all year (YTD +9%).` |
| **Materials** | `Stone & Mulch Depot $7,380 (paid 9/20) plus Green Valley GV-20931 $6,820 (mulch, pavers, sod), both already in the TB. Higher job volume than Sep 2025.` |
| **Subcontractors** | `One payment to Ramos Crew LLC, $7,600 (9/23). About 8% of revenue, same as Aug and Sep 2025.` |
| **Wages** | `Two payrolls of $9,250 ($18,500), flat to Sep 2025, plus the $2,775 accrual for Sep 28-30 (AJE-003), which reverses 10/01.` |
| **Repairs & Maintenance** | `Only one repair this month: Tri-County Mower Repair $1,350 (9/26). Timing; no unrecorded repair bills in the packet.` |

   > (Materials) "Materials is the Stone and Mulch payment plus the Green Valley invoice; the job volume is up on last year."
   >
   > (Wages) "And wages are flat on last year once you take out the new accrual."

3. *Point at the tab label: the count is gone.*

   > "All six explained."

## 8. Sign-off and exports (5:50–6:35)

1. Click **Mark as final**.

   > "Finalizing is only allowed once every item is answered and every flux line is explained. Then it asks who prepared and who reviewed it, and they have to be different people. There's no login in this demo, so it's clear the names are typed, not authenticated."

2. In **Prepared by**, type `Kim Delos Reyes`. In **Reviewed by**, type `Alex Morgan`. Click **Confirm final**.
3. Click **Cover**. *Point at the names and timestamps.*

   > "The sign-off is on the cover and in the audit trail."

4. Click **Export to Excel**. *Show the download.*

   > "The statements export to Excel, one sheet per statement."

5. Click **Journal Entries**, then **Export JE import (CSV)**. *Show the download.*

   > "And the entries export as a journal import file for NetSuite or QuickBooks, with the reversal dates. Nothing is ever sent to the client from here."

## 9. Ask AI and audit trail (6:35–7:00)

1. Click **Ask AI** (top right). In the box, type `Why wasn't the Green Valley invoice booked?` and press **Enter**.

   *Wait for the answer and point at it.*

   > "The assistant explains entries from the current data. It can't change any numbers, and it ignores instructions hidden in documents; I tested that with a booby-trapped packet."

2. Press **Esc** to close it, then click **Audit Trail**.

   > "And every upload, answer, edit and sign-off is logged here."

## 10. Close (7:00–7:20)

> "To sum up: the numbers come from deterministic rules, covered by 125 unit tests and 225 browser tests mapped to your brief. AI reads what the rules can't, interprets typed answers, and explains. The accountant makes the judgment calls and signs off. Thanks for watching."

---

## If something goes wrong while recording

- **Wrong answer saved on an open item:** click the item's row, pick the right option, **Save answer**.
- **Stuck with an unbalanced entry:** expand it and click **Reset** on the edited line.
- **Mark as final is blocked:** the dialog lists what's still open. Fix those items, then try again.
- **Ask AI is slow or errors:** click **Retry** in the error bubble, or skip it. Everything else works without AI.
- **To start over:** **Close Packet** → **Reset session** → **OK**.
