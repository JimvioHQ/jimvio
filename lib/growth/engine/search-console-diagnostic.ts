import {
  readSearchConsoleQueries,
  sanitizeSearchQuery,
  type SearchConsoleRead,
} from "./search-console";

type FailureCode = Extract<SearchConsoleRead, { ok: false }>["code"];

export type SearchConsoleSample = {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
};

export type SearchConsoleDiagnostic = {
  ok: boolean;
  code: FailureCode | null;
  status: number | null;
  rowCount: number;
  queries: SearchConsoleSample[];
};

const SECRET_SAMPLE = /BEGIN [A-Z ]*PRIVATE KEY|PRIVATE KEY|private_key|client_email|ya29\.|eyJ[A-Za-z0-9_-]{10,}|Bearer\s+\S|service_account/i;

function empty(code: FailureCode, status: number | null = null): SearchConsoleDiagnostic {
  return { ok: false, code, status, rowCount: 0, queries: [] };
}

function sampleNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value;
}

function sampleQuery(value: string): string | null {
  const query = sanitizeSearchQuery(value);
  if (!query || SECRET_SAMPLE.test(query)) return null;
  return query;
}

/** Fixed public shape for a Search Analytics read. Credential material is never copied in. */
export function toSearchConsoleDiagnostic(result: SearchConsoleRead): SearchConsoleDiagnostic {
  if (!result.ok) return empty(result.code, result.status ?? null);
  const queries: SearchConsoleSample[] = [];
  for (const row of result.queries) {
    const query = sampleQuery(row.query);
    if (!query) continue;
    queries.push({
      query,
      clicks: sampleNumber(row.clicks),
      impressions: sampleNumber(row.impressions),
      position: Math.round(sampleNumber(row.position) * 100) / 100,
    });
    if (queries.length === 10) break;
  }
  return { ok: true, code: null, status: 200, rowCount: queries.length, queries };
}

function searchConsoleEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // ProcessEnv requires NODE_ENV. The reader uses only the Search Console names.
  return {
    NODE_ENV: env.NODE_ENV,
    GOOGLE_SEARCH_CONSOLE_SITE_URL: env.GOOGLE_SEARCH_CONSOLE_SITE_URL,
    GOOGLE_SEARCH_CONSOLE_CREDENTIALS: env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS,
  };
}

/**
 * Read-only Search Analytics check. Calls readSearchConsoleQueries and no other provider.
 */
export async function diagnoseSearchConsole(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  now?: Date;
  attempts?: number;
  backoffMs?: number;
} = {}): Promise<SearchConsoleDiagnostic> {
  try {
    const result = await readSearchConsoleQueries({
      env: searchConsoleEnv(input.env ?? process.env),
      fetchImpl: input.fetchImpl,
      now: input.now,
      attempts: input.attempts,
      backoffMs: input.backoffMs,
    });
    return toSearchConsoleDiagnostic(result);
  } catch {
    return empty("network");
  }
}
