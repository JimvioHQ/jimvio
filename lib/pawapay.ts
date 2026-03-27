/**
 * PawaPay Merchant API v2 — deposits (mobile money collection).
 * Sandbox: https://api.sandbox.pawapay.io  |  Production: https://api.pawapay.io
 * @see https://docs.pawapay.io/v2/docs/how_to_start
 */

import { getPawaPayPostHeaders, isPawaPayHttpSigningConfigured } from "@/lib/pawapay-http-signature";

export type PawaPayEnvConfig = {
  baseUrl: string;
  apiToken: string;
  isSandbox: boolean;
};

export function getPawaPayConfig(): PawaPayEnvConfig {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!apiToken) {
    throw new Error("PAWAPAY_API_TOKEN is not set");
  }

  /** When set (e.g. sandbox vs production), overrides PAWAPAY_ENV-based base URL. No trailing slash. */
  const explicitBase = process.env.PAWAPAY_BASE_URL?.trim();
  if (explicitBase) {
    const baseUrl = explicitBase.replace(/\/$/, "");
    const isSandbox =
      baseUrl.includes("sandbox") || baseUrl.includes("sandbox.pawapay") || baseUrl.includes("api.sandbox.pawapay");
    return { baseUrl, apiToken, isSandbox };
  }

  const raw = (process.env.PAWAPAY_ENV || "sandbox").toLowerCase().trim();
  const isSandbox = raw === "sandbox" || raw === "development" || raw === "dev";
  const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";
  return { baseUrl, apiToken, isSandbox };
}

export type PawaPayDepositInitBody = {
  depositId: string;
  amount: string;
  currency: string;
  payer: {
    type: "MMO";
    accountDetails: {
      phoneNumber: string;
      provider: string;
    };
  };
  clientReferenceId?: string;
  customerMessage?: string;
  metadata?: Array<Record<string, string | boolean>>;
};

export type PawaPayDepositInitResponse = {
  depositId: string | null;
  status: "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED";
  created?: string;
  failureReason?: { failureCode?: string; failureMessage?: string };
};

function formatPawaPayHttpError(status: number, data: unknown, text: string): string {
  const base =
    typeof data === "object" && data !== null && "failureReason" in data
      ? JSON.stringify((data as { failureReason?: unknown }).failureReason)
      : text.slice(0, 800);
  if (status === 401 && (base.includes("HTTP_SIGNATURE") || base.includes("signature"))) {
    return `PawaPay HTTP ${status}: ${base} — Your merchant account requires signed deposit/payout POSTs. Either: (A) Sandbox dashboard https://dashboard.sandbox.pawapay.io → System configuration / API tokens → disable signed financial requests, OR (B) run npm run pawapay:generate-signing-key, upload the public key, set PAWAPAY_HTTP_SIGNING_KEY_ID (from dashboard) + PAWAPAY_HTTP_SIGNING_PRIVATE_KEY, restart dev.`;
  }
  return `PawaPay HTTP ${status}: ${base}`;
}

export async function pawapayRequestJson<T>(path: string, init: RequestInit): Promise<T> {
  const { baseUrl, apiToken } = getPawaPayConfig();
  const url = `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (init.method || "GET").toUpperCase();
  const bodyStr =
    typeof init.body === "string"
      ? init.body
      : init.body != null
        ? JSON.stringify(init.body)
        : undefined;

  let headers: Record<string, string>;
  if (method === "POST" && bodyStr) {
    headers = await getPawaPayPostHeaders(url, bodyStr, apiToken);
    if (isPawaPayHttpSigningConfigured()) {
      console.log("[pawapay] POST with HTTP message signatures (RFC 9421):", url);
    }
  } else {
    headers = {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    };
  }

  const res = await fetch(url, {
    ...init,
    method,
    headers,
    body: bodyStr,
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`PawaPay: invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(formatPawaPayHttpError(res.status, data, text));
  }
  return data as T;
}

const LOG_SNIP = 8000;

/**
 * POST with full server logs (for /api/deposit debugging). Does not log the API token.
 * Throws if HTTP status is not OK, with response body in the Error message.
 */
export async function pawaPayPostJsonWithServerLogs<T>(
  path: string,
  bodyObject: unknown,
  logContext = "pawapay"
): Promise<{ status: number; data: T; baseUrl: string; isSandbox: boolean; rawText: string }> {
  const cfg = getPawaPayConfig();
  const url = `${cfg.baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const bodyJson = JSON.stringify(bodyObject);

  console.log(`[${logContext}] Sending request to PawaPay...`);
  console.log(`[${logContext}] BASE_URL=${cfg.baseUrl} isSandbox=${cfg.isSandbox}`);
  if (!cfg.isSandbox) {
    console.warn(
      `[${logContext}] WARNING: Not using sandbox host — use https://api.sandbox.pawapay.io + sandbox token so deposits appear in the sandbox dashboard (Deposits).`
    );
  }
  const payloadLog = bodyJson.length > LOG_SNIP ? `${bodyJson.slice(0, LOG_SNIP)}…` : bodyJson;
  console.log(`[${logContext}] Request payload:`, payloadLog);
  if (isPawaPayHttpSigningConfigured()) {
    console.log(`[${logContext}] HTTP message signatures enabled (RFC 9421)`);
  }

  const postHeaders = await getPawaPayPostHeaders(url, bodyJson, cfg.apiToken);

  const res = await fetch(url, {
    method: "POST",
    headers: postHeaders,
    body: bodyJson,
  });

  const rawText = await res.text();
  const bodyLog = rawText.length > LOG_SNIP ? `${rawText.slice(0, LOG_SNIP)}…` : rawText;
  console.log(`[${logContext}] Response received from PawaPay status=${res.status}`);
  console.log(`[${logContext}] Response body:`, bodyLog);

  let data: unknown;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    const err = new Error(`PawaPay: invalid JSON (${res.status}): ${rawText.slice(0, 200)}`);
    console.error(`[${logContext}]`, err.message);
    throw err;
  }

  if (!res.ok) {
    const err = new Error(formatPawaPayHttpError(res.status, data, rawText));
    console.error(`[${logContext}] PawaPay error:`, err.message);
    throw err;
  }

  return { status: res.status, data: data as T, baseUrl: cfg.baseUrl, isSandbox: cfg.isSandbox, rawText };
}

/** Format monetary amount as string per PawaPay rules (no leading zeros except < 1). */
export function formatPawaPayAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
  if (Number.isInteger(amount)) return String(amount);
  const s = amount.toFixed(4).replace(/\.?0+$/, "");
  return s;
}

/**
 * MSISDN: digits only, country code, no leading 0.
 * Uses shipping / profile hints when the user omits country code.
 */
export function normalizePawaPayMsisdn(raw: string, defaultCountryCallingCode: string): string {
  let d = raw.replace(/\D/g, "");
  const cc = defaultCountryCallingCode.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = cc + d.slice(1);
  if (cc && !d.startsWith(cc) && d.length <= 12) {
    d = cc + d;
  }
  return d;
}

export type PawaPayDepositFailureReason = {
  failureCode?: string;
  failureMessage?: string;
};

export type PawaPayDepositStatusResponse = {
  depositId?: string;
  /** Deposit lifecycle from `data.status`: COMPLETED, PROCESSING, FAILED, … */
  status?: string;
  /** Top-level envelope: FOUND, NOT_FOUND (not the deposit state) */
  searchStatus?: string;
  /** Present when status is FAILED (see PawaPay check-deposit-status docs). */
  failureReason?: PawaPayDepositFailureReason;
};

/**
 * GET /v2/deposits/{id} returns `{ status: "FOUND", data: { status: "COMPLETED", … } }`.
 * We expose `data.status` as `status` for callers.
 */
export async function checkDepositStatus(depositId: string): Promise<PawaPayDepositStatusResponse> {
  const raw = await pawapayRequestJson<{
    status?: string;
    data?: {
      depositId?: string;
      status?: string;
      failureReason?: PawaPayDepositFailureReason;
    };
  }>(`/v2/deposits/${encodeURIComponent(depositId)}`, {
    method: "GET",
  });
  const data = raw.data;
  return {
    depositId: data?.depositId,
    status: data?.status,
    searchStatus: raw.status,
    failureReason: data?.failureReason,
  };
}
