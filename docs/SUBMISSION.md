# Submission write-up

- **Live tool:** https://month-end-close.vercel.app
- **Recording:** <RECORDING_URL>
- **Code:** https://github.com/kimjoshuadr/month-end-close
- **Walkthrough script:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/DEMO_SCRIPT.md
- **QA report:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/QAQC_REPORT.md
- **Security review:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/SECURITY_REVIEW.md
- **Process docs:** https://github.com/kimjoshuadr/month-end-close/tree/main/docs

## 1. What I built and with which tools
Month-End Close is a web tool in the style of an ERP console (Next.js and TypeScript in one Docker container, deployed on Vercel). It has five modules: Close Packet, Journal Entries, Open Items, Financial Statements and Audit Trail. A live summary strip on every page shows unadjusted net income, adjustments, adjusted net income, Dr = Cr, unresolved items and entries booked.

- **Why this stack:** one container is easy to host privately; TypeScript keeps the accounting engine typed and testable; there is no database because this demo should not store client data.
- **AI at runtime:** DeepSeek, server-side only, used for three things: a fallback if a document can't be parsed by fixed rules, turning a typed answer into a choice, and an "Ask AI" panel that explains entries. It never produces numbers.

## 2. How it works end to end
1. **Read the packet.** Fixed parsing rules read the workbook (trial balance, payroll register, prepaid and fixed asset schedules) and the supporting PDF (bank statement, invoices, client email). It accepts .xlsx, .pdf, .txt and .csv. It then ties the documents out: bank ending balance to TB cash (84,320), payroll to the two Gusto debits, Materials and Fuel to bank plus invoices, and loan principal (1,640).
2. **Draft the entries** (each line cites its source, every entry balances):
   - AJE-001 prepaid insurance 1,800
   - AJE-002 depreciation 2,400
   - AJE-003 payroll accrual 3,052.50 (Sep 28 to 30 is 3 of 10 working days, plus 10% tax)
   - AJE-004 Lakeside electric 1,250 (September service, never recorded)
   - AJE-005 reclass of the $5,000 owner transfer out of revenue to Owner Contributions (booked as an assumption)
   - Net income goes from 38,200 to 24,697.50, shown as a bridge.
3. **Leave alone what is already right**, and say why: Green Valley and Summit Fuel are already in the TB (Materials 14,200 = 7,380 + 6,820; Fuel 4,300 = 2,160 + 2,140), and the Northline rental is an October expense.
4. **Flag what the documents don't settle** (7 items): the $5,000 transfer (contribution, loan or revenue), $9,490 of AP with no support, the Aug 31 payroll day expensed in September, the accrual method, revenue classification, no September distributions, and Northline. The accountant answers with buttons or a typed reply. Each option shows its net income effect, and answers update entries and statements immediately.
5. **Produce the statements** in the August format: cover, income statement for the month and year to date (2026 vs 2025, % of revenue), balance sheet, cash flows (month and YTD), and trailing twelve months.
   - Prior-year and opening balances come from the August package, so September ties: total assets 231,120, balanced; cash flow ends at 84,320, which equals the bank.
   - Click any figure to drill into the entries and source documents behind it.
6. **Review before final.** Statements stay DRAFT while items are unresolved. The accountant edits amounts in Journal Entries, which the statements follow, so they always tie. There are reviewer notes per statement, and every action is logged in the audit trail. Nothing is sent to the client.

## 3. Automated vs accountant
- **Automated:** extraction, tie-outs, schedule, invoice and payroll entries, detecting already-recorded invoices, statements, recalculation.
- **Accountant:** the treatment of the $5,000 (and approving the new Owner Loan account 2600 if they choose "loan"), AP support, the prior-period payroll cutoff, accepting the assumptions, and final review.
- **Guardrail:** entries booked on a documented default carry an "Assumed" badge until answered, and unsupported items are never booked silently.

## 4. How I used AI to build it
- **Orchestrator and executor.** I worked in Claude Code as the orchestrator, with Muse Spark 1.3 Contributor (via OpenCode) as the executor that wrote the code.
- **I did the accounting first.** Before any code, I read the packet myself, found the traps (already-recorded invoices, the out-of-period rental, the owner money in revenue, the payroll cutoff), and calculated the expected results by hand. Those numbers became the tests the executor had to pass.
- **Structured prompts.** A design document, then a reviewer agent questioned it, then a plan of ten tasks with exact function signatures and expected values. The executor worked test-first and committed per task.
- **Review loop.** After each handoff I re-ran the tests and checked screenshots at mobile, tablet and desktop widths. Review caught:
  - edits not reaching the entry cards
  - state lost on reload
  - tables clipped on tablets
  - a page that only crashed in a production build
  - a Save button that blocked confirming a default
- **Design iterations.** First a simple dashboard. Then I explored three directions with mockups. Finally I settled on an ERP console (NetSuite / Intacct style), because that is how accountants actually work.

## 5. Challenges, limits and next steps
- **Not feasible or not finished:**
  - The parsing rules are tuned to this packet's layout. Other layouts fall back to DeepSeek, which I could not test broadly.
  - The treatment of the $5,000 is an inference from the bank line and the client's email.
  - Statements round each line to whole dollars like the August PDF, so a total can be $1 off a hand re-foot.
  - Export is browser print to PDF.
  - There is no login.
- **What I would build next to make it a full close system** (what finance teams expect from NetSuite, Sage Intacct, BlackLine or FloQast):
  - **Enforced maker-checker:** real logins with preparer, reviewer and approver roles, so the sign-off names are authenticated and a preparer can't approve their own entries. Today the names are typed.
  - **Account reconciliations:** a workspace for bank, AP subledger and accrual reconciliations, with attachments, sign-off and roll-forward to next month. Today the tool runs tie-out checks but has no reconciliation records.
  - **Close checklist and calendar:** close tasks with owners, due dates (e.g. close day 1 to 5), dependencies and status, with the open items feeding into it.
  - **Period lock:** closing September so no one can change it after sign-off, with controlled reopen and an audit entry.
  - **Database and history:** persistent storage per client, entity and period, so October starts from September's closing balances, reversing entries post automatically, and prior closes stay available.
  - **Multi-entity and dimensions:** several clients and entities, departments or classes, and consolidation.
  - **GL integration:** posting approved entries straight to QuickBooks or NetSuite through their APIs instead of a CSV import.
  - **Learning recurring entries:** suggesting the same accruals, amortization and depreciation each month from history.
  - **More document layouts:** hardening the parsers on real packets from several clients.
- **What I'd need from you for production:**
  - Client data should live in an access-controlled store per client: encrypted, with role-based access for the assigned accountant and reviewer only, SSO, and retained audit logs.
  - It must never live in a browser session.
  - Client documents should only go to an LLM covered by a data-processing agreement (or an enterprise or self-hosted model).
  - Real packets from several clients to harden the parsers.
  - Your chart of accounts and policies for judgment calls.
  - Your review and approval workflow.
