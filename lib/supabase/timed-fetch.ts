/**
 * fetch for server-side Supabase clients that gives up instead of hanging.
 *
 * When the database is overloaded, requests used to wait until Vercel killed
 * the function after 300 s. A bounded wait lets pages show their error/empty
 * state quickly and frees the function. Storage uploads keep no limit.
 */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

export function timedFetch(timeoutMs = SUPABASE_REQUEST_TIMEOUT_MS): typeof fetch {
  return (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.includes("/storage/v1/object")) return fetch(input, init);
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal });
  };
}
