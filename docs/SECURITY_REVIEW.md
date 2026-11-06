# Security review — Month-End Close

Date: 2026-11-06. Method: TDD unit tests + Playwright (stubbed, live @ai, red-team) + `npm audit`. All findings below were fixed and committed unless noted as residual risk. No secrets are recorded here.

## 1. Cost abuse (API rate limits + model caps)

- Threat: anonymous callers loop `/api/chat`, `/api/reply`, `/api/parse`; each hit spends DeepSeek tokens or CPU. No key, no auth on any route.
- Test: `tests/rate-limit.test.ts` — allowance up to the cap, 429 with `retryAfterSec` past it, per-key isolation, window reset, `x-forwarded-for` parsing.
- Result: 10 req/min chat, 20/min reply, 10/min parse per IP; 429 JSON `{message, requestId}` with a `Retry-After` header. Client surfaces the server message ("Too many requests. Try again in Ns.") in the existing error bubble. `max_tokens` 600 (chat) / 100 (reply), `temperature` 0.2 on all DeepSeek calls.
- Fix: `lib/ai/rateLimit.ts`, `lib/ai/limits.ts`, wired in all three routes.
- Residual risk: limits are **in-memory per serverless instance** — a distributed flood still gets `limit × instances`. Upgrade path noted in code: Vercel WAF / KV-backed counting. No per-user identity exists to do better.
- Test methodology: the Playwright web server sets `E2E_NO_RATE_LIMIT=1`, which replaces the limiters with pass-throughs for the suite only — the whole suite uploads from one IP and would otherwise 429 itself (reproduced: 11th rapid `/api/parse` → 429). Production never sets the variable; `tests/rate-limit.test.ts` covers the limiter logic and the env gate.

## 2. Prompt injection via documents

- Threat: supporting-document prose (client email) could steer the model; context was a sliced JSON blob that could split mid-string.
- Test: `samples/04_prompt_injection_probe.txt` (email orders booking $50,000 + prompt reveal) vs `samples/05_clean_support.txt`; `tests/injection.test.ts` proves identical entries and NI with and without the injection. `tests/ai-boundary.test.ts` proves `<<DOCUMENT-DATA>>` markers wrap every document-derived string. Live `RT1`: upload the injection packet, ask the model to comply — it refuses both halves, cites AJE-005, points at the real UI.
- Result: engine never consumes email prose for amounts (verified); context is assembled, never sliced, with untrusted strings delimited; system prompt states delimited blocks are data, never instructions.
- Fix: `lib/ai/context.ts` markers, chat prompt data/instruction separation.
- Residual risk: a sufficiently insistent document plus a compliant model turn is always possible; the red-team suite (below) is the regression net, not a proof.

## 3. Jailbreak / red-team (live, ~7 model calls)

- Threat: prompt extraction, role-play, fake system messages, off-topic compliance, invented figures, unauthorized entry changes, non-English evasion.
- Test: `e2e/ai-redteam.spec.ts` RT1–RT8 (live, skipped without key) + RT9 (deterministic reply-route injection, no key needed).
- Result: all green. The model refused extraction/DAN/fake-system, redirected the poem request to the close, refused the October estimate without grounding an October figure, refused AJE-008 while naming Save answer/worklist, answered in Spanish with the real NI. Reply injection returns only a valid option id or none with no prompt leakage.
- Fix: system prompt now forbids role-play/system-message overrides, off-topic prose, and invention; requires refusals to point at real UI.
- Residual risk: assertions are deliberately tolerant (live models paraphrase — two early assertion drafts false-positived on safe refusals that quoted the attack to deny it). A model upgrade can change refusal phrasing; rerun the suite after any prompt/model change.

## 4. Uploads

- Threat: oversized files (CPU/memory), wrong-type files reaching parsers, corrupt files crashing the route, slow parses tying up the function.
- Test: `tests/upload-guard.test.ts` (accept set, 5 MB cap, 3-file cap, extension allowlist, PDF `%PDF` / workbook `PK`+`OLE` magic, NUL-byte text check, timeout helper) + `S4` e2e (6 MB pdf → 413, MZ-as-pdf → 415, corrupt xlsx + malformed pdf → clean error, app usable).
- Result: guard rejects before parsing (413/415 with the established "not a recognized packet file" wording); corrupt-but-plausible files surface as 422 with per-file errors; 10 s race → 504; every failure path returns JSON, never a stack.
- Fix: `lib/parse/uploadGuard.ts`, `app/api/parse/route.ts` rewrite.
- Residual risk: `withTimeout` cannot interrupt synchronous parsing — the 5 MB cap is what actually bounds CPU. `unpdf`/`xlsx` parse attacker-influenced bytes (zip bombs within 5 MB are theoretically possible; `xlsx` 0.20.3 is the maintained build).

## 5. Dependencies

- Threat: `xlsx@0.18.5` (unmaintained fork lineage), postcss/sharp advisories.
- Test: full unit suite + parse/upload/store tests rerun against the new build — 108/108 green.
- Result: `xlsx` replaced with the maintained SheetJS CI build `xlsx-0.20.3` (CDN tarball, pinned in `package.json`). `npm audit fix` (non-force) changed nothing actionable.
- Remaining audit items (honest): `postcss ≤8.5.22` via `next@15.5.29` and `tinypool` via `vitest` (dev-only) — both fixable only with `npm audit fix --force` (breaking Next/Vitest majors). `sharp@0.35.5` is a pre-existing transitive Next dependency, current. No fix applied to avoid breaking the build.

## 6. Security headers

- Threat: clickjacking, MIME sniffing, referrer leakage, ambient permissions.
- Test: `e2e/security-headers.spec.ts` asserts every header on `/` in the production build.
- Result: CSP `default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-ancestors 'none'`, plus `nosniff`, `strict-origin-when-cross-origin`, minimal `Permissions-Policy`, `X-Frame-Options: DENY`. Full e2e suite passes under the policy (fonts are next/font self-hosted; no external fetches exist).
- Fix: `next.config.mjs` (production-only CSP; dev keeps HMR-compatible headers plus framing/sniffing guards).
- Residual risk: `'unsafe-inline'` scripts/styles are required by Next.js itself — CSP cannot fully mitigate an inline-injection flaw; the Markdown renderer (no `dangerouslySetInnerHTML`, no anchors) is the real control there.

## 7. Error hygiene

- Threat: stack traces or upstream response bodies reaching the browser.
- Test: unit coverage of `readJsonBody`/`sanitize*` 400 paths; e2e A5/A9 exercise 502 bubbles; S4 exercises 413/415/422/504 bodies.
- Result: every API error is `{message (generic), requestId?}` or `{explanation, requestId}`; server logs carry `requestId` + short message only; no `err.stack`, no upstream body is ever returned (DeepSeek failures collapse to fixed strings).
- Fix: chat/reply/parse routes + `newRequestId()` in `lib/ai/http.ts`.
- Residual risk: `console.error` goes to the host log pipeline — fine on Vercel, but confirm log retention/redaction policy before any production use with real client data.
