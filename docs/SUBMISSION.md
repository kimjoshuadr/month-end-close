# Month-End Close: submission

- **Live tool:** https://month-end-close.vercel.app
- **Recording:** <RECORDING_URL>
- **Code:** https://github.com/kimjoshuadr/month-end-close
- **Walkthrough script:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/DEMO_SCRIPT.md
- **QA report:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/QAQC_REPORT.md
- **Security review:** https://github.com/kimjoshuadr/month-end-close/blob/main/docs/SECURITY_REVIEW.md
- **Process docs:** https://github.com/kimjoshuadr/month-end-close/tree/main/docs

To try it: open the live tool, click **Load sample packet** (or upload the three files), then work left to right through the tabs.

---

## 1. What I built, and the tools I used

**Month-End Close** is a web app laid out like an ERP console (NetSuite / Sage Intacct style), because that's where an accounting team already works. It has five modules:

- **Close Packet:** upload and tie-outs.
- **Journal Entries:** the drafted adjusting entries.
- **Open Items:** the worklist of judgment calls.
- **Financial Statements:** the September package.
- **Audit Trail:** a log of every action.

A summary strip on every page shows unadjusted net income, adjustments, adjusted net income, Dr = Cr, unresolved items and entries booked. It updates as you work.

| Tool | Why |
|---|---|
| **Next.js and TypeScript** | One codebase for the interface and the server routes. Types keep the accounting engine strict and testable. |
| **SheetJS and unpdf** | Read the Excel workbook and the PDFs, and write the Excel export. |
| **DeepSeek API** | The AI parts, all server-side. The key never reaches the browser. |
| **Vercel** | Hosting the live link. A Dockerfile is included for private hosting. |
| **Vitest and Playwright** | 125 unit tests and 222 browser tests. |
| **Claude Code, with Muse Spark 1.3 Contributor via OpenCode** | Building it (section 4). |

There's no database on purpose. Client data stays in the browser session and isn't stored on a server.

## 2. How it works, end to end

1. **Read the packet and tie it out.** Fixed parsing rules read the trial balance, payroll register, prepaid and fixed-asset schedules, bank statement, invoices and Dana's email. AI is only a fallback if a document can't be read. Before drafting anything, the tool runs five tie-outs, all of which pass:
   - The bank ending balance equals TB cash: $84,320.
   - The two Gusto debits equal the payroll register.
   - Materials and Fuel equal the bank payments plus the Green Valley and Summit invoices.
   - Loan principal equals the change in the loan balance: $1,640.

2. **Draft the adjusting entries.** Every line cites its source document, every entry balances, and only trial balance accounts are used.

   | Entry | Description | Amount |
   |---|---|---|
   | AJE-001 | Prepaid insurance | $1,800.00 |
   | AJE-002 | Depreciation | $2,400.00 |
   | AJE-003 | Payroll accrual: Sep 28–30 is 3 of 10 working days, plus 10% tax (auto-reverses 10/01) | $3,052.50 |
   | AJE-004 | Lakeside electric, September service never recorded (auto-reverses 10/01) | $1,250.00 |
   | AJE-005 | The $5,000 owner transfer, moved out of revenue into owner contributions. Marked **Assumed** until the accountant confirms it | $5,000.00 |

   A net income bridge shows the move from **$38,200.00 to $24,697.50**.

3. **Leave alone what's already right, and say why.** Green Valley and Summit Fuel are already in the trial balance (Materials 14,200 = 7,380 + 6,820; Fuel 4,300 = 2,160 + 2,140), so booking them again would double count. The Northline rental is for October, so it's out of period.

4. **Flag what the documents don't settle.** There are seven items in a worklist:
   - The $5,000 transfer: contribution, loan or revenue.
   - $9,490 of payables with no support.
   - The Aug 31 payroll day that was expensed in September.
   - The accrual method.
   - Revenue classification.
   - No owner distributions in September.
   - The October rental.

   Each option shows its net income effect. The accountant answers with a button, a typed sentence ("it was a loan from Dana") or the keyboard. Everything recalculates instantly, and there's Undo.

5. **Produce the September package in the August format.** It contains:
   - a cover
   - an income statement for the month (2026 vs 2025, with % of revenue)
   - a year-to-date income statement
   - a trailing twelve months income statement
   - a balance sheet
   - cash flows

   Prior-year figures and opening balances come from the August package, so September ties: total assets of $231,120 balance, and the cash flow ends at $84,320, the bank balance. Click any figure to see the entries and documents behind it.

6. **Review like a close team would.**
   - **Flux review:** compares each line with August and with September last year. It flags 6 lines that moved by at least $1,000 and 10% (e.g. Materials +25.8% vs Sep 2025, Repairs −31.8% vs August), and each one needs an explanation.
   - **Mark as final:** blocked until every open item is answered and every flux line is explained. It then asks for a preparer and a different reviewer, and their names and times appear on the cover.
   - **Exports:** a journal-entry import CSV (NetSuite/QuickBooks style, with reversal dates) and an Excel copy of the statements.
   - **Nothing is ever sent to the client.**

## 3. What's automated, and what still needs the accountant

| Automated | Needs the accountant |
|---|---|
| Reading the packet and tying it to the trial balance | The treatment of the $5,000 (and approving new account 2600 if they call it a loan) |
| Schedule, invoice and payroll entries, with sources | Following up the $9,490 of payables with no support |
| Spotting invoices that are already booked or out of period | Whether to correct the prior-period payroll day |
| Recalculating entries, statements and flux on every change | Accepting the assumptions the tool made |
| Statements, exports and the audit trail | Explaining the flagged flux lines, final review and sign-off |

**Guardrails:**
- Anything booked on a default is badged **Assumed** until answered.
- Anything without support is never booked silently.
- The AI never produces a number: every figure comes from tested, deterministic code. The AI assistant can explain an entry, but it can't change one.

## 4. How I used AI to build it

- **Roles.** I worked as the orchestrator in Claude Code, and used Muse Spark 1.3 Contributor (through OpenCode) as the executor that wrote the code. My job was judgment, specification and review. Its job was implementation.
- **The accounting came first.** Before any code, I worked through the packet myself and found the traps: invoices already booked, the out-of-period rental, the owner's money sitting in revenue, the payroll cutoff. I calculated the expected answers by hand (adjusted net income $24,697.50, total assets $231,120), and those numbers became the tests the code had to pass.
- **Structured prompts, not chat.**
  - A design document, challenged by a separate reviewer agent.
  - A plan of ten tasks with exact function names and expected values.
  - Test-first work, committing after each task.
  - Later rounds were briefed the same way: each a short spec with acceptance tests.
- **QA mapped to your brief.** Every requirement in the instructions became a Playwright test (R1–R19), run at desktop, tablet and mobile sizes plus a reduced-motion run.
- **What review caught:**
  - edits not reaching the entry cards
  - work lost on page reload
  - a page that only crashed in production
  - a Save button that blocked confirming a default
  - raw markdown in AI answers
  - the AI pointing to buttons that don't exist
- **Iterations on the design.** First a basic dashboard. Then three explored directions. Then the ERP console that shipped. Then a pass on interactions (undo, keyboard shortcuts, live number changes).
- **Security review.**
  - Rate limits and token caps.
  - Upload size and file-type checks.
  - Security headers.
  - A prompt-injection test packet whose email tries to make the AI recommend booking $50,000 to revenue.
  - A red-team set of jailbreak prompts.
  - The AI refused all of them, and the injected packet produces exactly the same entries as the clean one.

## 5. Challenges, limits and what's next

**What I couldn't fully do, and why:**
- **Parsing:** the rules are tuned to this packet's layout. Other layouts fall back to the AI, which I couldn't test on a range of real packets.
- **The $5,000:** its treatment is an inference from the bank line and Dana's email, which is why it's flagged and badged rather than final.
- **Rounding:** statements round each line to whole dollars like the August PDF, so a total can be $1 off a hand re-foot.
- **Sign-off names:** they are typed, not authenticated. There's no login, so maker-checker isn't enforced.
- **Rate limits:** they are kept in memory on each server instance, so a determined abuser could get around them. A shared store or firewall rule fixes that.

**What I'd build next to make it a full close system** (what teams expect from NetSuite, Sage Intacct, BlackLine or FloQast):
- **Enforced maker-checker:** logins with preparer, reviewer and approver roles.
- **Account reconciliations:** a workspace for bank, AP subledger and accruals, with attachments and roll-forward.
- **Close checklist:** tasks with owners and due dates (close day 1 to 5), with the open items feeding into it.
- **Period lock:** after sign-off, with a controlled reopen.
- **A database and history:** so October starts from September and the reversing entries post themselves.
- **Multi-entity, dimensions and consolidation.**
- **Direct posting to the GL:** to QuickBooks or NetSuite through their APIs instead of a CSV.
- **Learning recurring entries month to month,** and hardening the parsers on real packets.

**What I'd need from you for production:**
- **Where client data lives:** a per-client, access-controlled store, encrypted, with retained audit logs, never in a browser session.
- **Who can see it:** only the assigned accountant and reviewer, through SSO with role-based access.
- **AI and client documents:** they only go to a model covered by a data-processing agreement, or an enterprise or self-hosted model.
- **From your side:** real packets from a few clients, your chart of accounts and judgment policies (materiality, accrual thresholds), and your review and approval workflow.
