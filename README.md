# Month-End Close: AI-assisted close tool (demo)

ERP-style console (Close Packet, Journal Entries, Open Items, Financial Statements, Audit Trail). Reads a month-end packet (workbook + bank statement/invoices/client email PDF; .xlsx, .pdf, .txt, .csv), drafts adjusting journal entries with source citations, flags what the documents do not settle, lets the accountant answer or edit, and regenerates draft September 2026 financial statements (cover, income statement month and YTD, balance sheet, cash flows, trailing twelve months) in the August example format. All client data is fictional. Nothing is sent to anyone.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, click "Load sample packet"
npm run e2e          # 108 Playwright tests (E2E_BASE_URL=<url> to test a deployment)
npm test             # 65 tests: engine, parser, store, reply mapper, TTM
```

Live: https://month-end-close.vercel.app (Vercel). Self-hosting with Docker / Coolify:

```bash
docker build -t month-end-close .
docker run -p 3000:3000 -e DEEPSEEK_API_KEY=... month-end-close
```

On Coolify: new resource from this public repo, build pack "Dockerfile", port 3000, add `DEEPSEEK_API_KEY` as an environment variable (optional: without it the tool works fully; only the typed-reply fallback and Ask AI are disabled).

## How it works

- `lib/parse/*`: deterministic parsing of the workbook (SheetJS) and PDFs (unpdf). DeepSeek is called only if deterministic parsing fails or totals do not tie.
- `lib/engine/*`: pure functions. `proposal.ts` builds AJEs, flags, "checked, no entry" items and tie-outs; `statements.ts` builds the four statements; `compute()` re-derives everything from (packet, answers, overrides) on every change. No numbers come from an LLM.
- `state/*`: browser-only session state (sessionStorage). No database, nothing stored server-side.
- DeepSeek is used for: parse fallback, mapping a typed reply to an option, and the Ask AI chat (which can explain but cannot change numbers).

See `docs/SUBMISSION.md` for the write-up, `docs/DEMO_SCRIPT.md` for the recording script, `docs/screenshots/` and `docs/superpowers/` for the design and plan.
