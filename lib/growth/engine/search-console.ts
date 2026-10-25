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

export type SearchPageRow = {
  page: string;
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
    if (parsed.length === 25) break;
  }
  return parsed;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type SearchConsoleFailure = Extract<SearchConsoleRead, { ok: false }>;

const SECRET_ROW = /BEGIN [A-Z ]*PRIVATE KEY|PRIVATE KEY|private_key|client_email|ya29\.|eyJ[A-Za-z0-9_-]{10,}|Bearer\s+\S|service_account/i;

function metricFields(record: { clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown }) {
  return {
    clicks: finite(record.clicks),
    impressions: finite(record.impressions),
    ctr: finite(record.ctr),
    position: finite(record.position),
  };
}

/** Page rows from Search Analytics. Query strings and credential-like URLs are dropped. */
export function parseSearchAnalyticsPages(body: unknown): SearchPageRow[] {
  if (!body || typeof body !== "object") return [];
  const rows = (body as { rows?: unknown }).rows;
  if (!Array.isArray(rows)) return [];
  const parsed: SearchPageRow[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const keys = (row as { keys?: unknown }).keys;
    const raw = Array.isArray(keys) && typeof keys[0] === "string" ? keys[0].trim() : "";
    if (!raw || raw.length > 300 || SECRET_ROW.test(raw)) continue;
    let page: string;
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.username || url.password) continue;
      url.search = "";
      url.hash = "";
      page = url.toString();
    } catch {
      continue;
    }
    const record = row as { clicks?: unknown; impressions?: unknown; ctr?: unknown; position?: unknown };
    parsed.push({ page, ...metricFields(record) });
    if (parsed.length === 25) break;
  }
  return parsed;
}

async function authorizeSearchConsole(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
}): Promise<{ ok: true; site: string; accessToken: string } | SearchConsoleFailure> {
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
  return { ok: true, site, accessToken };
}

async function postSearchAnalytics(input: {
  site: string;
  accessToken: string;
  dimensions: Array<"query" | "page">;
  rowLimit: number;
  now: Date;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
}) {
  const end = new Date(input.now.getTime() - 86_400_000);
  const start = new Date(end.getTime() - 27 * 86_400_000);
  return providerRequest({
    url: `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(input.site)}/searchAnalytics/query`,
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate: isoDay(start),
      endDate: isoDay(end),
      dimensions: input.dimensions,
      rowLimit: input.rowLimit,
      dataState: "all",
    }),
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
}

export function failureCode(status: number): "unauthorized" | "forbidden" | "http_error" {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  return "http_error";
}

function analyticsFailure(report: { ok: false; code: "network" | "http_error" | "invalid_json"; status: number }): SearchConsoleFailure {
  return report.code === "network"
    ? { ok: false, code: "network" }
    : { ok: false, code: report.code === "invalid_json" ? "invalid_json" : failureCode(report.status), status: report.status };
}

export async function readSearchConsoleQueries(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
}): Promise<SearchConsoleRead> {
  const auth = await authorizeSearchConsole(input);
  if (!auth.ok) return auth;
  const now = input.now ?? new Date();
  const report = await postSearchAnalytics({
    site: auth.site,
    accessToken: auth.accessToken,
    dimensions: ["query"],
    rowLimit: 10,
    now,
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  });
  if (!report.ok) return analyticsFailure(report);
  const queries = parseSearchAnalyticsBody(report.body);
  return { ok: true, rowCount: queries.length, queries };
}

export type SearchConsoleSurface =
  | { ok: true; queries: SearchQueryRow[]; pages: SearchPageRow[]; pageRead: "read" | "failed" }
  | SearchConsoleFailure;

/**
 * One readonly token, then a query report and a page report.
 * Search Analytics returns rows by clicks descending. The diagnostic query stays on readSearchConsoleQueries.
 */
export async function readSearchConsoleSurface(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
}): Promise<SearchConsoleSurface> {
  const auth = await authorizeSearchConsole(input);
  if (!auth.ok) return auth;
  const now = input.now ?? new Date();
  const shared = {
    site: auth.site,
    accessToken: auth.accessToken,
    now,
    fetchImpl: input.fetchImpl,
    attempts: input.attempts,
    backoffMs: input.backoffMs,
  };
  const queriesReport = await postSearchAnalytics({ ...shared, dimensions: ["query"], rowLimit: 25 });
  if (!queriesReport.ok) return analyticsFailure(queriesReport);
  const pagesReport = await postSearchAnalytics({ ...shared, dimensions: ["page"], rowLimit: 25 });
  return {
    ok: true,
    queries: parseSearchAnalyticsBody(queriesReport.body).slice(0, 25),
    pages: pagesReport.ok ? parseSearchAnalyticsPages(pagesReport.body) : [],
    pageRead: pagesReport.ok ? "read" : "failed",
  };
}
