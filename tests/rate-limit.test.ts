import { describe, expect, it } from "vitest";
import { clientIp, createRateLimiter } from "../lib/ai/rateLimit";

describe("createRateLimiter", () => {
  it("allows up to the limit, then blocks with a retry delay", () => {
    let t = 0;
    const rl = createRateLimiter(3, 60_000, () => t);
    expect(rl.check("a")).toEqual({ ok: true, retryAfterSec: 0 });
    expect(rl.check("a")).toEqual({ ok: true, retryAfterSec: 0 });
    expect(rl.check("a")).toEqual({ ok: true, retryAfterSec: 0 });
    const blocked = rl.check("a");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });
  it("resets after the window and isolates keys", () => {
    let t = 0;
    const rl = createRateLimiter(1, 60_000, () => t);
    expect(rl.check("a").ok).toBe(true);
    expect(rl.check("a").ok).toBe(false);
    expect(rl.check("b").ok).toBe(true);
    t += 60_001;
    expect(rl.check("a").ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first forwarded address", () => {
    const req = new Request("http://x/", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x/"))).toBe("unknown");
  });
});
