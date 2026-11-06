# Close Desk: AI-assisted month-end close (demo)

Reads a month-end packet (workbook + bank statement/invoices/client email PDF), drafts adjusting journal entries with source citations, flags what the documents do not settle, lets the accountant answer or edit, and regenerates draft September 2026 financial statements in the August example format. All client data is fictional. Nothing is sent to anyone.

## Run

```bash
npm install
npm run dev          # http://localhost:3000, click "Load sample packet"
npm test             # engine, parser, store and reply-mapper tests
```

Docker / Coolify:

```bash
docker build -t closedesk .
docker run -p 3000:3000 -e DEEPSEEK_API_KEY=... closedesk
```

On Coolify: new resource from this public repo, build pack "Dockerfile", port 3000, add `DEEPSEEK_API_KEY` as an environment variable (optional: without it the tool works fully; only the typed-reply fallback and Ask AI are disabled).

## How it works

- `lib/parse/*`: deterministic parsing of the workbook (SheetJS) and PDFs (unpdf). DeepSeek is called only if deterministic parsing fails or totals do not tie.
- `lib/engine/*`: pure functions. `proposal.ts` builds AJEs, flags, "checked, no entry" items and tie-outs; `statements.ts` builds the four statements; `compute()` re-derives everything from (packet, answers, overrides) on every change. No numbers come from an LLM.
- `state/*`: browser-only session state (sessionStorage). No database, nothing stored server-side.
- DeepSeek is used for: parse fallback, mapping a typed reply to an option, and the Ask AI chat (which can explain but cannot change numbers).

See `docs/SUBMISSION.md` for the write-up and `docs/superpowers/` for the design and plan.
