import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { checkResendAuthentication } from "./resend-auth-check.ts";
import { handleResendAuthDiagnostic } from "./resend-auth-diagnostic.ts";
import { clearRateLimitsForTests } from "../ops/rate-limit.ts";

const SECRET = "re_test_secret_value_not_for_production_use";

function adminUser(): User {
  return { id: "11111111-1111-4111-8111-111111111111", email: "admin@example.com" } as User;
}

test("non-admin callers are denied before Resend is contacted", async () => {
  clearRateLimitsForTests();
  let called = false;
  const denied = await handleResendAuthDiagnostic(
    { ok: false, error: "Not authenticated.", status: 401 },
    { check: async () => { called = true; return { ok: true, httpStatus: 200, errorName: null, errorMessage: null }; } },
  );
  assert.equal(denied.status, 401);
  assert.equal(called, false);
  const forbidden = await handleResendAuthDiagnostic(
    { ok: false, error: "Admin access required.", status: 403 },
    { check: async () => { called = true; return { ok: true, httpStatus: 200, errorName: null, errorMessage: null }; } },
  );
  assert.equal(forbidden.status, 403);
  assert.equal(called, false);
  assert.equal(denied.headers.get("cache-control"), "no-store, max-age=0");
});

test("an authorized admin receives only the sanitized Resend result", async () => {
  clearRateLimitsForTests();
  let authorization = "";
  const response = await handleResendAuthDiagnostic(
    { ok: true, user: adminUser() },
    {
      now: 1_000,
      check: () =>
        checkResendAuthentication({
          apiKey: SECRET,
          fetchImpl: async (input, init) => {
            authorization = new Headers(init?.headers).get("Authorization") ?? "";
            assert.equal(String(input), "https://api.resend.com/domains");
            assert.equal(init?.method, "GET");
            return new Response(JSON.stringify({ name: "invalid_api_key", message: `API key is invalid ${SECRET}` }), {
              status: 403,
            });
          },
        }),
    },
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.ok, false);
  assert.equal(body.httpStatus, 403);
  assert.equal(body.errorName, "invalid_api_key");
  assert.equal(body.errorMessage.includes(SECRET), false);
  assert.equal(body.errorMessage.includes("[redacted]"), true);
  assert.equal(JSON.stringify(body).includes(SECRET), false);
  assert.equal(authorization, `Bearer ${SECRET}`);
  assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
});

test("a successful Resend response passes without returning domains or the key", async () => {
  clearRateLimitsForTests();
  const response = await handleResendAuthDiagnostic(
    { ok: true, user: adminUser() },
    {
      now: 100_000,
      check: () =>
        checkResendAuthentication({
          apiKey: SECRET,
          fetchImpl: async () =>
            new Response(JSON.stringify({ data: [{ name: "jimvio.com", status: "verified" }] }), { status: 200 }),
        }),
    },
  );
  const body = await response.json();
  assert.deepEqual(body, { ok: true, httpStatus: 200, errorName: null, errorMessage: null });
});

test("the same admin is rate limited after three checks", async () => {
  clearRateLimitsForTests();
  const auth = { ok: true as const, user: adminUser() };
  const check = async () => ({ ok: true, httpStatus: 200, errorName: null, errorMessage: null });
  for (let i = 0; i < 3; i += 1) {
    const response = await handleResendAuthDiagnostic(auth, { now: 200_000, check });
    assert.equal(response.status, 200);
  }
  const blocked = await handleResendAuthDiagnostic(auth, { now: 200_000, check });
  assert.equal(blocked.status, 429);
  const body = await blocked.json();
  assert.equal(body.errorName, "rate_limited");
});

test("the route is server-authorized and does not log the key", () => {
  const route = readFileSync(join(process.cwd(), "app/api/admin/resend-auth-check/route.ts"), "utf8");
  const check = readFileSync(join(process.cwd(), "lib/email/resend-auth-check.ts"), "utf8");
  assert.match(route, /assertPlatformAdmin/);
  assert.equal(route.includes("searchParams"), false);
  assert.equal(check.includes("console."), false);
  assert.match(check, /https:\/\/api\.resend\.com\/domains/);
  assert.equal(check.includes("/emails"), false);
});
