import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { diagnoseResend } from "./resend-diagnostic";

const KEY = "re_unit_test_key";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function configuredEnv(): NodeJS.ProcessEnv {
  return { RESEND_API_KEY: KEY, UNRELATED_SECRET: "do-not-copy" };
}

describe("Resend domains diagnostic", () => {
  it("does not call Resend when the key is missing", async () => {
    let calls = 0;
    const result = await diagnoseResend({
      env: { UNRELATED_SECRET: KEY },
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(200, { data: [] });
      },
      attempts: 1,
      backoffMs: 0,
    });
    assert.equal(calls, 0);
    assert.deepEqual(result, { ok: false, code: "missing", status: null, domainCount: 0 });
  });

  it("returns only the domain count from a successful domains read", async () => {
    const urls: string[] = [];
    const result = await diagnoseResend({
      env: configuredEnv(),
      fetchImpl: async (input) => {
        urls.push(String(input));
        return jsonResponse(200, {
          data: [
            { id: "d_1", name: "jimvio.com", status: "verified", region: "us-east-1" },
            { name: "example.jimvio.com" },
          ],
          api_key: KEY,
        });
      },
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(result, { ok: true, code: null, status: 200, domainCount: 2 });
    assert.deepEqual(urls, ["https://api.resend.com/domains"]);
    const encoded = JSON.stringify(result);
    assert.equal(encoded.includes(KEY), false);
    assert.equal(encoded.includes("jimvio.com"), false);
    assert.equal(encoded.includes("api_key"), false);
    assert.deepEqual(Object.keys(result).sort(), ["code", "domainCount", "ok", "status"]);
  });

  it("reports unauthorized and forbidden without the provider body", async () => {
    const unauthorized = await diagnoseResend({
      env: configuredEnv(),
      fetchImpl: async () => jsonResponse(401, { name: "restricted_api_key", message: `Bearer ${KEY}` }),
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(unauthorized, { ok: false, code: "unauthorized", status: 401, domainCount: 0 });
    assert.equal(JSON.stringify(unauthorized).includes(KEY), false);
    assert.equal(JSON.stringify(unauthorized).includes("restricted_api_key"), false);

    const forbidden = await diagnoseResend({
      env: configuredEnv(),
      fetchImpl: async () => jsonResponse(403, { name: "suspended_api_key", message: KEY }),
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(forbidden, { ok: false, code: "forbidden", status: 403, domainCount: 0 });
    assert.equal(JSON.stringify(forbidden).includes(KEY), false);
  });

  it("reports a rate limit as the status only", async () => {
    const result = await diagnoseResend({
      env: configuredEnv(),
      fetchImpl: async () => jsonResponse(429, { name: "rate_limit_exceeded", message: KEY }),
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(result, { ok: false, code: "http_error", status: 429, domainCount: 0 });
    assert.equal(JSON.stringify(result).includes(KEY), false);
    assert.equal(JSON.stringify(result).includes("rate_limit_exceeded"), false);
  });

  it("reports a network failure without the thrown message", async () => {
    const result = await diagnoseResend({
      env: configuredEnv(),
      fetchImpl: async () => {
        throw new Error(`network down ${KEY}`);
      },
      attempts: 1,
      backoffMs: 0,
    });
    assert.deepEqual(result, { ok: false, code: "network", status: null, domainCount: 0 });
    assert.equal(JSON.stringify(result).includes(KEY), false);
  });

  it("keeps the admin route on the platform admin guard and off sends and cycles", () => {
    const route = readFileSync(new URL("../../../app/api/admin/growth/engine/resend/route.ts", import.meta.url), "utf8");
    const diagnostic = readFileSync(new URL("./resend-diagnostic.ts", import.meta.url), "utf8");
    const handler = route.slice(route.indexOf("export async function GET"));
    const authAt = handler.indexOf("requirePlatformAdmin(");
    const readAt = handler.indexOf("diagnoseResend(");
    assert.ok(authAt >= 0 && readAt > authAt);
    assert.match(route, /export async function GET/);
    assert.doesNotMatch(route, /export async function POST/);
    assert.match(route, /Cache-Control": "no-store"/);
    assert.doesNotMatch(route, /sendResendConnectivityTest|probeIntegrations|runGrowthCycle|applyEngineAction|console\./);
    assert.match(diagnostic, /readResendDomains/);
    assert.doesNotMatch(diagnostic, /sendResendConnectivityTest|probeIntegrations|runGrowthCycle|api\.resend\.com\/emails/);
  });
});
