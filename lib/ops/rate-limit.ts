type Window = { startedAt: number; hits: number };
const windows = new Map<string, Window>();

/**
 * Process-local sliding window limiter. Use Redis/KV before depending on this
 * for multi-instance enforcement.
 */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = windows.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    windows.set(key, { startedAt: now, hits: 1 });
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: now + windowMs };
  }

  current.hits += 1;
  return {
    allowed: current.hits <= limit,
    remaining: Math.max(0, limit - current.hits),
    resetAt: current.startedAt + windowMs,
  };
}

export function clearRateLimitsForTests() {
  windows.clear();
}
