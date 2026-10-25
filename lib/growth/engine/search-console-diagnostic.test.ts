import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { diagnoseSearchConsole } from "./search-console-diagnostic";

const now = new Date("2026-10-25T12:00:00.000Z");

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function serviceAccount(): string {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  return JSON.stringify({
    type: "service_account",
    client_email: "growth@example.iam.gserviceaccount.com",
    private_key: pem,
  });
}

function configuredEnv(): NodeJS.ProcessEnv {
  return {
    GOOGLE_SEARCH_CONSOLE_SITE_URL: "sc-domain:jimvio.com",
    GOOGLE_SEARCH_CONSOLE_CREDENTIALS: serviceAccount(),
  };
}

function tokenThen(report: (url: string) => Response): typeof fetch {
  return async (input) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com")) return jsonResponse(200, { access_token: "ya29.unit-test" });
    return report(url);
  };
}

describe("Search Console diagnostic", () => {
  it("does not call Google when credentials are missing", async () => {
    let calls = 0;
    const result = await diagnoseSearchConsole({
      env: { UNRELATED_SECRET: "do-not-copy" },
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200, {});
      },
      now,
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { ok: false, code: "missing", status: null, rowCount: 0, queries: [] });
  });

  it("rejects malformed service-account JSON before any request", async () => {
    let calls = 0;
    const result = await diagnoseSearchConsole({
      env: {
        GOOGLE_SEARCH_CONSOLE_SITE_URL: "sc-domain:jimvio.com",
        GOOGLE_SEARCH_CONSOLE_CREDENTIALS: "{\"type\":\"authorized_user\"}",
      },
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200, { access_token: "ya29.should-not-be-requested" });
      },
      now,
    });
    assert.equal(calls, 0);
    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid_credentials");
    assert.equal(result.status, null);
    assert.equal(JSON.stringify(result).includes("authorized_user"), false);
    assert.equal(JSON.stringify(result).includes("ya29"), false);
  });

  it("returns a successful empty query list", async () => {
    const urls: string[] = [];
    const result = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: tokenThen((url) => {
        urls.push(url);
        return jsonResponse(200, { rows: [], access_token: "ya29.should-not-leak" });
      }),
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(result.ok, true);
    assert.equal(result.code, null);
    assert.equal(result.status, 200);
    assert.equal(result.rowCount, 0);
    assert.deepEqual(result.queries, []);
    assert.equal(urls.length, 1);
    assert.equal(urls[0]?.includes("/searchAnalytics/query"), true);
    assert.equal(JSON.stringify(result).includes("ya29"), false);
    assert.equal(JSON.stringify(result).includes("BEGIN"), false);
  });

  it("returns sanitized query samples and drops secret-like text", async () => {
    const result = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: tokenThen(() => jsonResponse(200, {
        rows: [
          { keys: ["jimvio marketplace\n"], clicks: 3, impressions: 10, ctr: 0.3, position: 4.256 },
          { keys: [`${"x".repeat(120)} trailing`], clicks: 1, impressions: 2, position: 1 },
          { keys: ["-----BEGIN PRIVATE KEY-----"], clicks: 1, impressions: 1, position: 1 },
        ],
        private_key: "must-not-leak",
      })),
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(result.ok, true);
    assert.equal(result.rowCount, 2);
    assert.equal(result.queries[0]?.query, "jimvio marketplace");
    assert.equal(result.queries[0]?.clicks, 3);
    assert.equal(result.queries[0]?.impressions, 10);
    assert.equal(result.queries[0]?.position, 4.26);
    assert.equal(result.queries[1]?.query.length, 80);
    assert.equal("ctr" in (result.queries[0] ?? {}), false);
    const encoded = JSON.stringify(result);
    assert.equal(encoded.includes("BEGIN"), false);
    assert.equal(encoded.includes("private_key"), false);
    assert.equal(encoded.includes("ya29"), false);
    assert.deepEqual(Object.keys(result).sort(), ["code", "ok", "queries", "rowCount", "status"]);
  });

  it("reports Google API errors without the response body", async () => {
    const unauthorized = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: async () => jsonResponse(401, { error: "invalid_grant", error_description: "ya29.leak private_key" }),
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(unauthorized, { ok: false, code: "unauthorized", status: 401, rowCount: 0, queries: [] });
    assert.equal(JSON.stringify(unauthorized).includes("ya29"), false);
    assert.equal(JSON.stringify(unauthorized).includes("private_key"), false);

    let searchCalls = 0;
    const forbidden = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: tokenThen(() => {
        searchCalls += 1;
        return jsonResponse(403, { error: { message: "permission denied for private_key material", status: "PERMISSION_DENIED" } });
      }),
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(searchCalls, 1);
    assert.deepEqual(forbidden, { ok: false, code: "forbidden", status: 403, rowCount: 0, queries: [] });
    assert.equal(JSON.stringify(forbidden).includes("private_key"), false);

    const quota = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: tokenThen(() => jsonResponse(429, { error: { status: "RESOURCE_EXHAUSTED", message: "quota" } })),
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(quota.ok, false);
    assert.equal(quota.code, "http_error");
    assert.equal(quota.status, 429);

    const network = await diagnoseSearchConsole({
      env: configuredEnv(),
      fetchImpl: async () => {
        throw new Error("BEGIN PRIVATE KEY network failure");
      },
      now,
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(network, { ok: false, code: "network", status: null, rowCount: 0, queries: [] });
    assert.equal(JSON.stringify(network).includes("BEGIN"), false);
  });

  it("keeps the admin route on the platform admin guard and off the growth cycle", () => {
    const route = readFileSync(new URL("../../../app/api/admin/growth/engine/search-console/route.ts", import.meta.url), "utf8");
    const diagnostic = readFileSync(new URL("./search-console-diagnostic.ts", import.meta.url), "utf8");
    const handler = route.slice(route.indexOf("export async function GET"));
    const authAt = handler.indexOf("requirePlatformAdmin(");
    const readAt = handler.indexOf("diagnoseSearchConsole(");
    assert.ok(authAt >= 0 && readAt > authAt);
    assert.match(route, /export async function GET/);
    assert.doesNotMatch(route, /export async function POST/);
    assert.match(route, /Cache-Control": "no-store"/);
    assert.doesNotMatch(route, /probeIntegrations|readResendDomains|readGoogleAdsCustomer|readMetaAdAccount|runGrowthCycle|applyEngineAction|console\./);
    assert.match(diagnostic, /readSearchConsoleQueries/);
    assert.doesNotMatch(diagnostic, /probeIntegrations|readResendDomains|readGoogleAdsCustomer|readMetaAdAccount|runGrowthCycle/);
  });
});
