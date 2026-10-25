import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, describe, it } from "node:test";
import { assertCronAuthorized } from "./cron-auth";

const KEYS = ["VERCEL_ENV", "NODE_ENV", "CRON_SECRET"] as const;
const previous = new Map(KEYS.map((key) => [key, process.env[key]]));

function restoreEnv() {
  for (const key of KEYS) {
    const value = previous.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function cronRequest(headers: Record<string, string> = {}) {
  return new Request("https://www.jimvio.com/api/cron/growth-engine", { headers });
}

describe("cron authentication", () => {
  afterEach(() => restoreEnv());

  it("disables preview and fails closed when a hosted deployment has no secret", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.CRON_SECRET = "cron-test-secret";
    const preview = assertCronAuthorized(cronRequest({ authorization: "Bearer cron-test-secret" }));
    assert.equal(preview?.status, 403);

    delete process.env.CRON_SECRET;
    process.env.VERCEL_ENV = "production";
    const missing = assertCronAuthorized(cronRequest());
    assert.equal(missing?.status, 503);
  });

  it("accepts only the configured bearer or header secret", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.NODE_ENV = "production";
    process.env.CRON_SECRET = "cron-test-secret";
    assert.equal(assertCronAuthorized(cronRequest())?.status, 401);
    assert.equal(assertCronAuthorized(cronRequest({ authorization: "Bearer wrong-secret" }))?.status, 401);
    assert.equal(assertCronAuthorized(cronRequest({ authorization: "Bearer cron-test-secret" })), null);
    assert.equal(assertCronAuthorized(cronRequest({ "x-cron-secret": "cron-test-secret" })), null);
  });

  it("keeps the growth cron behind the shared authorization check", () => {
    const source = readFileSync(new URL("../../app/api/cron/growth-engine/route.ts", import.meta.url), "utf8");
    const authAt = source.indexOf("assertCronAuthorized");
    const runAt = source.indexOf("runCronCycle");
    assert.ok(authAt >= 0 && runAt > authAt);
    assert.match(source, /growth_engine_cron_failed/);
    assert.match(source, /growth_engine_cron_finished/);
  });
});
