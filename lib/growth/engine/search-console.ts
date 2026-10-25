import { createSign } from "node:crypto";
import { providerRequest } from "./provider-http";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

export type SearchQueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type SearchConsoleRead =
  | { ok: true; rowCount: number; queries: SearchQueryRow[] }
  | { ok: false; code: "missing" | "invalid_credentials" | "invalid_site" | "unauthorized" | "forbidden" | "http_error" | "network" | "invalid_json"; status?: number };

type ServiceAccount = { clientEmail: string; privateKey: string };

export function sanitizeSearchQuery(value: string): string {
  return value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function validSearchConsoleSite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200 || /[\s@]/.test(trimmed)) return false;
  if (trimmed.startsWith("sc-domain:")) return /^sc-domain:[a-z0-9.-]+$/i.test(trimmed);
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function parseServiceAccount(raw: string): ServiceAccount | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const clientEmail = record.client_email;
  const privateKey = record.private_key;
  if (record.type !== "service_account") return null;
  if (typeof clientEmail !== "string" || !/^[^@\s]+@[^@\s]+$/.test(clientEmail)) return null;
  if (typeof privateKey !== "string" || !privateKey.includes("BEGIN PRIVATE KEY")) return null;
  return { clientEmail, privateKey };
}

function base64url(value: string | Buffer): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

export function signServiceAccountJwt(account: ServiceAccount, nowSeconds: number): string | null {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    iss: account.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${payload}`);
    signer.end();
    return `${header}.${payload}.${signer.sign(account.privateKey).toString("base64url")}`;
  } catch {
    return null;
  }
}

function finite(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number.NaN;
  return Number.isFinite(numeric) ? numeric : 0;
}

export function parseSearchAnalyticsBody(body: unknown): SearchQueryRow[] {
  if (!body || typeof body !== "object") return [];
  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  const parsed: SearchQueryRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const keys = (row as { keys?: unknown }).keys;
    const query = Array.isArray(keys) && typeof keys[0] === "string" ? sanitizeSearchQuery(keys[0]) : "";
    if (!query) continue;
    const record = row as { clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown };
    parsed.push({
      query,
      clicks: finite(record.clicks),
      impressions: finite(record.impressions),
      ctr: finite(record.ctr),
      position: finite(record.position),
    });
    if (parsed.length === 10) break;
  }
  return parsed;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function failureCode(status: number): "unauthorized" | "forbidden" | "http_error" {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "http_error";
}

export async function readSearchConsoleQueries(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
}): Promise<SearchConsoleRead> {
  const env = input.env ?? process.env;
  const site = env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim() ?? "";
  const credentials = env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS?.trim() ?? "";
  if (!site || !credentials) return { ok: false, code: "missing" };
  if (!validSearchConsoleSite(site)) return { ok: false, code: "invalid_site" };
  const account = parseServiceAccount(credentials);
  if (!account) return { ok: false, code: "invalid_credentials" };
  const now = input.now ?? new Date();
  const assertion = signServiceAccountJwt(account, Math.floor(now.getTime() / 1000));
  if (!assertion) return { ok: false, code: "invalid_credentials" };

  const token = await providerRequest({
    url: TOKEN_URL,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${encodeURIComponent(assertion)}`,
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!token.ok) {
    return token.code === "network"
      ? { ok: false, code: "network" }
      : { ok: false, code: token.code === "invalid_json" ? "invalid_json" : failureCode(token.status), status: token.status };
  }
  const accessToken = token.body && typeof token.body === "object"
    ? (token.body as { access_token?: unknown }).access_token
    : null;
  if (typeof accessToken !== "string" || !accessToken) return { ok: false, code: "invalid_credentials" };

  const end = new Date(now.getTime() - 86_400_000);
  const start = new Date(end.getTime() - 27 * 86_400_000);
  const report = await providerRequest({
    url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: isoDay(start),
      endDate: isoDay(end),
      dimensions: ["query"],
      rowLimit: 10,
      dataState: "all",
    }),
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!report.ok) {
    return report.code === "network"
      ? { ok: false, code: "network" }
      : { ok: false, code: report.code === "invalid_json" ? "invalid_json" : failureCode(report.status), status: report.status };
  }
  const queries = parseSearchAnalyticsBody(report.body);
  return { ok: true, rowCount: queries.length, queries };
}
