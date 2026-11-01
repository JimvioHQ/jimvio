/**
 * Bounded fetch for server-side Supabase clients.
 *
 * Database/API stalls must not hold a Vercel function indefinitely. Safe
 * idempotent reads get a small bounded retry for transient gateway/network
 * failures; mutations are never replayed automatically.
 */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

const RETRYABLE_READ_STATUSES = new Set([502, 503, 504, 520, 522]);

export function timedFetch(timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/storage/v1/object")) return fetch(input, init);

    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const canRetry = method === "GET" || method === "HEAD";
    const maxAttempts = canRetry ? 2 : 1;
    let lastError: unknown;

    const callerSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const timeout = AbortSignal.timeout(timeoutMs);
      const signal = callerSignal ? AbortSignal.any([callerSignal, timeout]) : timeout;

      try {
        const response = await fetch(input, { ...init, signal });
        if (!canRetry || !RETRYABLE_READ_STATUSES.has(response.status) || attempt === maxAttempts - 1) {
          if (canRetry && RETRYABLE_READ_STATUSES.has(response.status)) {
            console.warn("[supabase] read request returned a transient gateway error after retries", {
              method,
              status: response.status,
            });
          }
          return response;
        }

        await response.body?.cancel().catch(() => undefined);
      } catch (error) {
        lastError = error;
        // Respect caller cancellation; only retry transport/timeout failures.
        if (!canRetry || callerSignal?.aborted || attempt === maxAttempts - 1) throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }

    throw lastError instanceof Error ? lastError : new Error("Supabase request failed");
  };
}
