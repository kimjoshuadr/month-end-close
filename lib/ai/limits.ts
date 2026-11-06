// Shared limiter instances (per serverless instance; see rateLimit.ts note).
// E2E_NO_RATE_LIMIT=1 disables them for the Playwright web server only: the
// whole suite uploads from a single IP and would otherwise 429 itself.
// Production (Vercel) never sets it. Unit tests cover the limiter logic.
import { createRateLimiter } from "./rateLimit";

type Limiter = ReturnType<typeof createRateLimiter>;

const BYPASS = process.env.E2E_NO_RATE_LIMIT === "1";
const unlimited = (): Limiter => ({ check: () => ({ ok: true, retryAfterSec: 0 }) });

export const chatLimiter: Limiter = BYPASS ? unlimited() : createRateLimiter(10, 60_000);
export const replyLimiter: Limiter = BYPASS ? unlimited() : createRateLimiter(20, 60_000);
export const parseLimiter: Limiter = BYPASS ? unlimited() : createRateLimiter(10, 60_000);
