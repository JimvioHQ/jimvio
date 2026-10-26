import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearRateLimitsForTests, rateLimit } from "@/lib/ops/rate-limit";
import { authenticateApiKey } from "./auth";
import { generateApiKey } from "./idempotency";
import { apiKeyAuditMetadata, apiKeyHashMatches, issuableApiScopes, parseApiKeyName, parseRequestedScopes } from "./keys";

function keyDb(row: Record<string, unknown> | null) {
  const updates: Array<Record<string, unknown>> = [];
  const db = {
    from() {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: async () => ({ data: row }) };
            },
          };
        },
        update(payload: Record<string, unknown>) {
          updates.push(payload);
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };
  return { db: db as unknown as SupabaseClient, updates };
}

describe("developer API keys", () => {
  it("issues only scopes that a live v1 route checks", () => {
    const scopes = issuableApiScopes();
    assert.deepEqual(scopes.includes("products:write" as never), false);
    assert.equal(parseRequestedScopes(["products:read", "orders:write"]).ok, true);
    const rejected = parseRequestedScopes(["products:read", "products:write"]);
    assert.equal(rejected.ok, false);
    assert.equal(parseRequestedScopes([]).ok, false);
    assert.equal(parseApiKeyName("  Store sync  ").ok, true);
    assert.equal(parseApiKeyName("a").ok, false);
  });

  it("stores a hash and shows the raw secret only to the caller that just created it", () => {
    const generated = generateApiKey();
    assert.equal(generated.raw.startsWith("jmv_"), true);
    assert.equal(generated.prefix, generated.raw.slice(0, 12));
    assert.equal(generated.hash.includes(generated.raw), false);
    assert.equal(apiKeyHashMatches(generated.hash, generated.raw), true);
    assert.equal(apiKeyHashMatches(generated.hash, `${generated.raw}x`), false);
    assert.equal(apiKeyHashMatches(null, generated.raw), false);
    const audit = JSON.stringify(apiKeyAuditMetadata({
      keyId: "11111111-1111-4111-8111-111111111111",
      prefix: generated.prefix,
      scopes: ["products:read"],
    }));
    assert.equal(audit.includes(generated.raw), false);
    assert.equal(audit.includes(generated.hash), false);
  });

  it("keeps list responses and the retired channel page free of secrets", () => {
    const route = readFileSync(join(process.cwd(), "app/api/dropshipping/api-keys/route.ts"), "utf8");
    const listSelect = route.slice(route.indexOf("export async function GET"), route.indexOf("export async function POST"));
    assert.equal(listSelect.includes("key_hash"), false);
    assert.equal(listSelect.includes("secret"), false);
    assert.match(route, /api_key\.created/);
    assert.match(route, /api_key\.revoked/);
    assert.match(route, /rateLimit\(`api-key-create:/);
    const retired = readFileSync(join(process.cwd(), "app/(public)/commerce/api-keys/page.tsx"), "utf8");
    assert.match(retired, /ChannelRetiredPage/);
    const manager = readFileSync(join(process.cwd(), "components/developers/api-key-manager.tsx"), "utf8");
    assert.equal(manager.includes("localStorage"), false);
    const middleware = readFileSync(join(process.cwd(), "lib/supabase/middleware.ts"), "utf8");
    assert.match(middleware, /\/developers/);
    assert.match(middleware, /\/login/);
  });

  it("rejects missing, revoked, expired, and out-of-scope keys", async () => {
    const generated = generateApiKey();
    const header = `Bearer ${generated.raw}`;
    const missing = await authenticateApiKey(keyDb(null).db, null, "products:read");
    assert.equal(missing.ok, false);
    const sessionToken = await authenticateApiKey(keyDb(null).db, "Bearer session-token", "products:read");
    assert.equal(sessionToken.ok, false);
    if (!sessionToken.ok) assert.equal(sessionToken.status, 401);

    const base = {
      id: "11111111-1111-4111-8111-111111111111",
      vendor_id: "22222222-2222-4222-8222-222222222222",
      key_hash: generated.hash,
      scopes: ["products:read"],
      revoked_at: null,
      expires_at: null,
      rate_limit_per_minute: 120,
    };
    const revoked = await authenticateApiKey(keyDb({ ...base, revoked_at: "2026-10-26T00:00:00Z" }).db, header, "products:read");
    assert.equal(revoked.ok, false);
    const expired = await authenticateApiKey(keyDb({ ...base, expires_at: "2020-01-01T00:00:00Z" }).db, header, "products:read");
    assert.equal(expired.ok, false);
    const wrong = await authenticateApiKey(keyDb({ ...base, key_hash: "a".repeat(64) }).db, header, "products:read");
    assert.equal(wrong.ok, false);
    const scope = await authenticateApiKey(keyDb(base).db, header, "orders:write");
    assert.equal(scope.ok, false);
    if (!scope.ok) assert.equal(scope.status, 403);

    const live = keyDb(base);
    const ok = await authenticateApiKey(live.db, header, "products:read");
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.auth.vendorId, base.vendor_id);
    assert.equal(live.updates.length, 1);
    assert.equal(typeof live.updates[0]?.last_used_at, "string");
  });

  it("rate limits key creation independently of the session cookie", () => {
    clearRateLimitsForTests();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      assert.equal(rateLimit("api-key-create:user-1", 8, 60 * 60_000, 1_000).allowed, true);
    }
    assert.equal(rateLimit("api-key-create:user-1", 8, 60 * 60_000, 1_000).allowed, false);
    assert.equal(rateLimit("api-key-create:user-2", 8, 60 * 60_000, 1_000).allowed, true);
    clearRateLimitsForTests();
  });
});
