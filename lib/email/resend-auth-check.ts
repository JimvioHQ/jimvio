/**
 * Temporary production diagnostic. Calls Resend without sending mail.
 * The API key is read only on the server and is never returned or logged.
 */

export type ResendAuthCheckResult = {
  ok: boolean;
  httpStatus: number | null;
  errorName: string | null;
  errorMessage: string | null;
};

const RESEND_DOMAINS_URL = "https://api.resend.com/domains";

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/re_[A-Za-z0-9_-]{6,}/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .slice(0, 200);
  return cleaned || null;
}

export async function checkResendAuthentication(options?: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}): Promise<ResendAuthCheckResult> {
  const apiKey = (options?.apiKey ?? process.env.RESEND_API_KEY ?? "").trim();
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: null,
      errorName: "missing_key",
      errorMessage: "RESEND_API_KEY is not set in this runtime",
    };
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl(RESEND_DOMAINS_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as {
      name?: unknown;
      message?: unknown;
    } | null;
    return {
      ok: response.ok,
      httpStatus: response.status,
      errorName: response.ok ? null : sanitizeText(payload?.name),
      errorMessage: response.ok ? null : sanitizeText(payload?.message),
    };
  } catch {
    return {
      ok: false,
      httpStatus: null,
      errorName: "network_error",
      errorMessage: "The authentication request could not be completed",
    };
  }
}
