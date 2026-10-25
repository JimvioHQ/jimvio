import { providerRequest } from "./provider-http";
import { failureCode } from "./search-console";

const GOOGLE_CUSTOMER_READ = /^https:\/\/googleads\.googleapis\.com\/v21\/customers\/\d{10}$/;
const META_ACCOUNT_READ = /^https:\/\/graph\.facebook\.com\/v21\.0\/act_\d{5,20}\?fields=id,account_status,currency,spend_cap$/;

export type AdsRead =
  | { ok: true; accountId: string; status: string | null; currency: string | null; providerSpendCap: string | null }
  | { ok: false; code: "missing" | "invalid_account" | "unauthorized" | "forbidden" | "http_error" | "network" | "invalid_json"; status?: number };

export type SpendGate = {
  capUsd: number | null;
  authorized: boolean;
  /** Submission is intentionally unimplemented. This flag never creates a charge. */
  submissionImplemented: false;
  reason: string;
};

export function normalizeGoogleCustomerId(raw: string): string | null {
  const digits = raw.replace(/-/g, "").trim();
  return /^\d{10}$/.test(digits) ? digits : null;
}

export function normalizeMetaAccountId(raw: string): string | null {
  const body = raw.trim().replace(/^act_/, "");
  return /^\d{5,20}$/.test(body) ? `act_${body}` : null;
}

export function googleAdsReadUrl(customerId: string): string | null {
  const url = `https://googleads.googleapis.com/v21/customers/${customerId}`;
  return GOOGLE_CUSTOMER_READ.test(url) ? url : null;
}

export function metaAdsReadUrl(accountId: string): string | null {
  const url = `https://graph.facebook.com/v21.0/${accountId}?fields=id,account_status,currency,spend_cap`;
  return META_ACCOUNT_READ.test(url) ? url : null;
}

export function spendGate(env: NodeJS.ProcessEnv = process.env): SpendGate {
  const raw = env.GROWTH_ADS_SPEND_CAP_USD?.trim() ?? "";
  const cap = raw ? Number(raw) : Number.NaN;
  const capUsd = Number.isFinite(cap) && cap >= 0 && cap <= 100_000 ? cap : null;
  const authorized = env.GROWTH_ADS_SPEND_AUTHORIZED?.trim() === "1";
  const parts = [
    capUsd === null ? "Set GROWTH_ADS_SPEND_CAP_USD to a number from 0 through 100000." : `Spend cap is recorded as ${capUsd} USD.`,
    authorized ? "GROWTH_ADS_SPEND_AUTHORIZED is 1." : "Set GROWTH_ADS_SPEND_AUTHORIZED=1 only after the owner accepts that cap.",
    "Spend submission is not implemented, so no campaign is created and no charge is made.",
  ];
  return { capUsd, authorized, submissionImplemented: false, reason: parts.join(" ") };
}

function present(env: NodeJS.ProcessEnv, name: string): boolean {
  return Boolean(env[name]?.trim());
}

export function googleAdsMissing(env: NodeJS.ProcessEnv): string[] {
  return ["GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_ACCESS_TOKEN"].filter((name) => !present(env, name));
}

export function metaAdsMissing(env: NodeJS.ProcessEnv): string[] {
  return ["META_ADS_ACCOUNT_ID", "META_ADS_ACCESS_TOKEN"].filter((name) => !present(env, name));
}

function mapFailure(result: { code: string; status: number }): AdsRead {
  if (result.code === "network") return { ok: false, code: "network" };
  if (result.code === "invalid_json") return { ok: false, code: "invalid_json", status: result.status };
  return { ok: false, code: failureCode(result.status), status: result.status };
}

export async function readGoogleAdsCustomer(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
}): Promise<AdsRead> {
  const env = input.env ?? process.env;
  if (googleAdsMissing(env).length > 0) return { ok: false, code: "missing" };
  const customerId = normalizeGoogleCustomerId(env.GOOGLE_ADS_CUSTOMER_ID ?? "");
  const url = customerId ? googleAdsReadUrl(customerId) : null;
  if (!customerId || !url) return { ok: false, code: "invalid_account" };
  const result = await providerRequest({
    url,
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.GOOGLE_ADS_ACCESS_TOKEN!.trim()}`,
      "developer-token": env.GOOGLE_ADS_DEVELOPER_TOKEN!.trim(),
    },
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!result.ok) return mapFailure(result);
  const body = result.body && typeof result.body === "object" ? result.body as Record<string, unknown> : {};
  return {
    ok: true,
    accountId: customerId,
    status: typeof body.status === "string" ? body.status.slice(0, 40) : null,
    currency: typeof body.currencyCode === "string" ? body.currencyCode.slice(0, 8) : null,
    providerSpendCap: null,
  };
}

export async function readMetaAdAccount(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
}): Promise<AdsRead> {
  const env = input.env ?? process.env;
  if (metaAdsMissing(env).length > 0) return { ok: false, code: "missing" };
  const accountId = normalizeMetaAccountId(env.META_ADS_ACCOUNT_ID ?? "");
  const url = accountId ? metaAdsReadUrl(accountId) : null;
  if (!accountId || !url) return { ok: false, code: "invalid_account" };
  const result = await providerRequest({
    url,
    method: "GET",
    headers: { Authorization: `Bearer ${env.META_ADS_ACCESS_TOKEN!.trim()}` },
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!result.ok) return mapFailure(result);
  const body = result.body && typeof result.body === "object" ? result.body as Record<string, unknown> : {};
  return {
    ok: true,
    accountId,
    status: body.account_status === undefined ? null : String(body.account_status).slice(0, 40),
    currency: typeof body.currency === "string" ? body.currency.slice(0, 8) : null,
    providerSpendCap: typeof body.spend_cap === "string" || typeof body.spend_cap === "number"
      ? String(body.spend_cap).slice(0, 40)
      : null,
  };
}
