const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export type ProviderHttpResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; status: number; code: "network" | "http_error" | "invalid_json"; message: string };

/**
 * Read a provider response without copying the body into the error.
 * Redirects are refused so a bearer token cannot follow to another host.
 */
export async function providerRequest(input: {
  url: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: string;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
}): Promise<ProviderHttpResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const attempts = Math.min(3, Math.max(1, input.attempts ?? 2));
  const backoffMs = input.backoffMs ?? 200;
  let last: ProviderHttpResult = { ok: false, status: 0, code: "network", message: "Network request failed." };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchImpl(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body,
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
      const text = await response.text();
      if (!response.ok) {
        last = { ok: false, status: response.status, code: "http_error", message: `HTTP ${response.status}` };
        if (!RETRYABLE_STATUS.has(response.status) || attempt === attempts - 1) return last;
      } else if (!text) {
        return { ok: true, status: response.status, body: {} };
      } else {
        try {
          return { ok: true, status: response.status, body: JSON.parse(text) as unknown };
        } catch {
          return { ok: false, status: response.status, code: "invalid_json", message: "Response was not JSON." };
        }
      }
    } catch {
      last = { ok: false, status: 0, code: "network", message: "Network request failed." };
      if (attempt === attempts - 1) return last;
    }
    if (backoffMs > 0) await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }

  return last;
}
