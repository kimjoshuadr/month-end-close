# Walkthrough script: Month-End Close (about 6 minutes)

**Links:** [Live tool](https://month-end-close.vercel.app) · [Code](https://github.com/kimjoshuadr/month-end-close) · [Sample packet files](https://github.com/kimjoshuadr/month-end-close/tree/main/samples) · [Write-up](https://github.com/kimjoshuadr/month-end-close/blob/main/docs/SUBMISSION.md)

**Before recording**
- Open https://month-end-close.vercel.app in Chrome, full width (1440px or wider), zoom 100%.
- Download the three packet files from [samples/](https://github.com/kimjoshuadr/month-end-close/tree/main/samples) and keep them in a Finder window.
- On the Close Packet tab, click **Reset session** if a previous session is loaded.
- Have two names ready for the sign-off, e.g. "Kim Delos Reyes" and "Marisol Ontiveros".
- Legend: **Bold** = click. *Italics* = point at. Quotes = say it.

---

## 1. Intro (0:00–0:20)
*Close Packet tab, empty.*

> "Hi, I'm Kim. This is Month-End Close, the tool I built for the Greenline Landscape September close. It reads the month-end packet, drafts the adjusting entries with a source on every line, flags what the documents don't settle, and produces the September statements in your August format. The accountant makes the judgment calls, and everything updates live."

## 2. Upload and tie-outs (0:20–1:00)
*Drag the workbook onto the Workbook row, then the supporting PDF and the August PDF onto the Supporting PDF row.*

> "I'll upload the packet: the workbook with the trial balance, payroll register and schedules, and the PDF with the bank statement, invoices and Dana's email."

*Point at Validation and tie-outs.*

> "Before drafting anything, it ties the documents to the trial balance. Bank matches cash at 84,320. The two Gusto payroll debits match the register. Materials and Fuel tie exactly to the bank payments plus the Green Valley and Summit invoices, which is how it knows those invoices are already booked. And the loan principal of 1,640 ties to the change in the loan."

*Point at the summary strip.*

> "This strip is on every page: 38,200 unadjusted, 24,697.50 adjusted, debits equal credits, seven items open."

## 3. Journal entries (1:00–1:50)
**Click Journal Entries.** **Expand AJE-003.**

> "Five drafted entries. Prepaid insurance, 1,800, from the schedule. Depreciation, 2,400. The payroll accrual, 3,052.50: the next pay period starts September 26, so the 28th to the 30th is 3 of 10 working days, plus 10% tax. Every line cites its source, and it's marked to auto-reverse on October 1, like it would in an ERP."

*Point at AJE-004, then the orange Assumed badge on AJE-005.*

> "The Lakeside electric bill, 1,250, is September service that was never recorded; Dana's email confirms it. AJE-005 moves the 5,000 transfer out of revenue. It's marked Assumed because it's a judgment call; I'll come back to it."

*Scroll to Net income bridge and Checked, no entry needed.*

> "The bridge shows each entry's effect. And here's what it deliberately did not book: Green Valley and Summit are already in the trial balance, and the Northline rental is October, so it's out of period."

## 4. Edit a value, and undo (1:50–2:10)
*In AJE-004, change the debit and the credit to 2,000 (Enter after each).*

> "Any amount can be edited. Change the electric bill to 2,000 and net income drops 750 straight away; you can see the change on the strip."

*Point at the toast, click **Undo**.*

> "Every change can be undone."

## 5. Open items (2:10–3:20)
**Click Open Items.**

> "This is the worklist: everything the documents don't settle. Nothing is guessed silently."

*The $5,000 transfer is selected.*

> "The 5,000 transfer on September 12. The bank shows it came from account 4471, and Dana says it was her own money covering payroll. Each option shows its effect on net income."

*Type* `it was a loan from Dana` **→ Send.**

> "I can just type: 'it was a loan from Dana'. It picks Loan, and because that needs account 2600, which isn't in the trial balance, it says it needs approval instead of quietly adding it."

**Select Capital contribution (default) → Save answer.**

> "I'll confirm the contribution. It saves, shows the effect, and moves on."

*Accounts payable support:* **Acknowledge (default) → Save answer.**

> "18,450 of payables, but only 8,960 is supported by invoices in the packet. I'll acknowledge it as a request for the AP subledger."

*Press* `j`, `1`, `Enter` *on the next items.*

> "Power users can work from the keyboard: J and K to move, a number to choose, Enter to save. The question mark shows all shortcuts."

*Resolve the remaining items until "All items resolved".*

## 6. Statements (3:20–4:20)
**Click Financial Statements.** Step through **Cover**, **Income Statement — month**, **Income Statement — YTD**, **Balance Sheet**, **Cash Flows**, **Trailing Twelve Months**.

> "The September package in the August format: income statement for the month against last September with percent of revenue, year to date, and trailing twelve months. Opening balances and prior-year numbers come from the August package, so it ties."

*Balance Sheet:* "Total assets 231,120, and it balances."
*Cash Flows:* "It ends at 84,320, exactly the bank balance."

*Income Statement — month:* **click the Utilities figure.**

> "Every number drills down. Utilities shows the Lakeside entry and the bank line behind it."

## 7. Flux review (4:20–4:50)
**Click Flux Review.**

> "Like a real close, it reviews the movements: each line against August and against last September. Six lines moved by more than 1,000 dollars and 10 percent, like Materials up 26 percent on last year and Repairs down 32 percent on August, and each needs an explanation before the package can be finalized."

*Type a short explanation on Materials, e.g.* `Peak season; Green Valley pavers and sod for Parkside job` *and fill the rest.*

## 8. Sign-off and exports (4:50–5:30)
**Click Mark as final.**

> "Finalizing is blocked until every item is answered and every flux line is explained. Then it asks who prepared and who reviewed it; they have to be different people. There's no login in this demo, so it says the names are typed, not authenticated."

*Enter the two names →* **Confirm final**. *Show the names on the Cover.*

**Click Export to Excel**, then on Journal Entries **Export JE import (CSV)**.

> "The statements export to Excel, and the entries export as a journal import file for NetSuite or QuickBooks, with the reversal dates. Nothing is ever sent to the client from here."

## 9. Ask AI and audit trail (5:30–5:50)
**Click Ask AI** → `Why wasn't the Green Valley invoice booked?`

> "The assistant explains entries from the current data. It can't change numbers, and it ignores instructions hidden in documents; I tested that with a booby-trapped packet."

**Close it → Audit Trail.**

> "And every upload, answer, edit and sign-off is logged here."

## 10. Close (5:50–6:10)
> "To sum up: the numbers come from deterministic rules, covered by 125 unit tests and 222 browser tests mapped to your brief. AI reads what the rules can't, interprets typed answers, and explains. The accountant makes the judgment calls and signs off. Thanks for watching."
