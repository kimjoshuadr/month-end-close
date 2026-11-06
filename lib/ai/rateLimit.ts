// Per-key fixed-window rate limits for the AI and parse routes.
// NOTE: in-memory state is per serverless instance. It stops casual abuse
// from one client; Vercel WAF / KV-backed limits are the upgrade for production.

export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): { ok: boolean; retryAfterSec: number } {
      const t = now();
      const b = hits.get(key);
      if (!b || t >= b.resetAt) {
        hits.set(key, { count: 1, resetAt: t + windowMs });
        return { ok: true, retryAfterSec: 0 };
      }
      if (b.count < limit) {
        b.count += 1;
        return { ok: true, retryAfterSec: 0 };
      }
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - t) / 1000)) };
    },
  };
}

export function clientIp(req: Request): string {
  const first = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}
