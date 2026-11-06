# Walkthrough script: Month-End Close (about 5 minutes)

**Setup before recording**
- Open https://month-end-close.vercel.app in Chrome at full width (1440px or wider), zoom 100%.
- Have the three packet files in a Finder window: `01_Month_End_Workbook_Sep2026.xlsx`, `02_Supporting_Documents_Sep2026.pdf`, `03_Example_Financial_Statements_Aug2026.pdf`.
- If a previous session is loaded, click **Reset session** on the Close Packet tab first.
- **Bold** = what you click. *Italics* = what you point at. Quoted text = what you say.

---

## 1. Intro (0:00 to 0:20)
*Show the Close Packet tab, empty.*

> "Hi, I'm Kim. This is Month-End Close, a tool I built for the Greenline Landscape September 2026 close. It reads the month-end packet, drafts the adjusting entries, flags anything the documents don't settle, and produces the September financial statements in the same format as the August package. The accountant answers the flags and edits entries, and everything updates live."

## 2. Upload and tie-outs (0:20 to 1:00)
*Drag the workbook onto the Workbook row, then the supporting PDF (and the August PDF) onto the Supporting PDF row.*

> "I'll upload the packet: the workbook with the trial balance, payroll register and schedules, and the PDF with the bank statement, vendor invoices and Dana's email."

*Point at the Validation and tie-outs grid.*

> "Before drafting anything, the tool ties the documents back to the trial balance. The bank ending balance matches cash at 84,320. The two Gusto payroll debits match the register. Materials and Fuel tie exactly to the bank payments plus the Green Valley and Summit invoices, which tells me those invoices are already booked. And the loan principal of 1,640 ties to the change in the loan balance."

*Point at the summary strip.*

> "This strip stays on every page: unadjusted net income 38,200, adjusted 24,697.50, debits equal credits, and seven items still open."

## 3. Journal entries (1:00 to 1:50)
**Click Journal Entries.**

> "Here's the draft adjusting entry schedule."

**Expand AJE-001**, then scroll through the list.

> "Prepaid insurance, 1,800, straight from the schedule, which shows September wasn't recorded. Depreciation, 2,400, from the fixed asset schedule. Accrued payroll, 3,052.50: the next pay period starts September 26, so the 28th to the 30th is 3 of 10 working days, plus 10% employer tax. The Lakeside electric bill, 1,250, is September service that never got recorded; Dana's email confirms it. Every line cites its source document, and every entry balances."

*Point at AJE-005 with the orange Assumed badge.*

> "AJE-005 reclasses the 5,000 transfer out of revenue into owner contributions. It's marked Assumed because it's a judgment call, and I'll come back to it."

*Scroll to Net income bridge, then Checked, no entry needed.*

> "The bridge shows each entry's effect, from 38,200 down to 24,697.50. And this section shows what the tool deliberately did not book: Green Valley and Summit are already in the trial balance, and the Northline rental is for October, so it's out of period."

## 4. Edit a value (1:50 to 2:10)
**Expand AJE-004**, change the debit and the credit to **2,000**.

> "The accountant can adjust any amount. If I change the electric bill to 2,000, adjusted net income drops by 750 straight away, and the entry still balances."

**Click Reset** on both lines.

> "Reset puts it back."

## 5. Open items (2:10 to 3:20)
**Click Open Items.**

> "This is the worklist: everything the documents don't settle. Nothing here is guessed silently."

*The $5,000 transfer is selected. Point at the evidence.*

> "The 5,000 transfer on September 12. The bank shows it came from account 4471, and Dana says it was her own money covering payroll. The default is a capital contribution. The accountant can answer with a button or just type."

*Type* `it was a loan from Dana` *and **click Send**.*

> "If I type 'it was a loan from Dana', it picks Loan from owner. That needs a new account, 2600, which isn't in the trial balance, so the tool labels it as requiring approval instead of quietly adding it."

**Select Already correct as revenue.**

> "If it really was revenue, net income goes to 29,697.50."

**Select Capital contribution (default), then click Save answer.**

> "I'll confirm the contribution. The count drops and it moves to the next item."

*Point at the toast in the bottom right.*

> "Every save shows its net income effect, with Undo. Cmd+Z works too. Power users can work through this list from the keyboard: J and K to move, 1 to 3 to choose, Enter to save. Press ? to see all the shortcuts."

*On Accounts payable support:*

> "Accounts payable is 18,450, but only 8,960 is supported by invoices in the packet. The other 9,490 has no support, so the tool can't book or clear it. I'll acknowledge it as a request for the AP subledger."

**Click Acknowledge** (Save answer if shown).

*Briefly point at the August payroll cutoff and Northline items.*

> "The others are the same kind of call: one day of August payroll that was expensed in September, and whether to accrue the October rental."

## 6. Financial statements (3:20 to 4:20)
**Click Financial Statements.** Step through the tabs: **Cover**, **Income Statement — month**, **Income Statement — YTD**, **Balance Sheet**, **Cash Flows**, **Trailing Twelve Months**.

> "The September package follows the August format: a cover, the income statement for the month against September last year with percent of revenue, and year to date. Prior-year numbers and opening balances come from the August package, so it ties."

*On Balance Sheet:*

> "Total assets 231,120, and it balances."

*On Cash Flows:*

> "The cash flow ends at 84,320, exactly the bank balance."

*On Income Statement — month,* **click the Utilities figure.**

> "Any number drills down. Utilities shows the Lakeside entry and the bank line behind it."

*Point at the Draft ribbon and the Reviewer notes box.*

> "It stays a draft while items are open. The accountant can leave reviewer notes, and nothing is ever sent to the client."

## 7. Change an input, see it update (4:20 to 4:40)
**Click Open Items**, select **August payroll cutoff**, choose **Correct via retained earnings**, **Save answer**, then **click Financial Statements**.

> "If I change an answer, say I correct the August payroll day through retained earnings, net income moves to 25,715 and the balance sheet still balances."

## 8. Ask AI and the audit trail (4:40 to 5:00)
**Click Ask AI** and ask: `Why wasn't the Green Valley invoice booked?`

> "The assistant explains the entries using the current data, but it can't change any numbers."

**Close it, then click Audit Trail.**

> "And every upload, answer and edit is logged here."

## 9. Close (5:00 to 5:15)
> "To sum up: all the numbers come from deterministic rules and are covered by tests, with 65 unit tests and 108 browser tests at three screen sizes. AI helps read documents it can't parse, interprets typed answers, and explains. The accountant makes the judgment calls. Thanks for watching."
