// Shared limiter instances (per serverless instance; see rateLimit.ts note).
import { createRateLimiter } from "./rateLimit";

export const chatLimiter = createRateLimiter(10, 60_000);
export const replyLimiter = createRateLimiter(20, 60_000);
export const parseLimiter = createRateLimiter(10, 60_000);
