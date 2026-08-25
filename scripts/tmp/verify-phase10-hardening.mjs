/**
 * Phase 10 hardening — static/unit checks.
 * Parses source and migration SQL. Does not connect to production,
 * create users, call RPCs, or execute destructive endpoints.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function mustExist(rel) {
  const p = path.join(root, rel);
  assert.ok(fs.existsSync(p), `missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function stripSqlComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
}

const migration = mustExist("database/migrations/131_tighten_rls_money_and_comments.sql");
const migrationTwin = mustExist("supabase/migrations/20260825120000_tighten_rls_money_and_comments.sql");
assert.equal(stripSqlComments(migration), stripSqlComments(migrationTwin), "migration 131 twins must match");
assert.match(migration, /wallet_deposits_select_own/);
assert.match(migration, /DROP POLICY IF EXISTS community_post_comments_select/);
assert.match(migration, /ugc_campaign_escrow_select_own/);
assert.match(migration, /REVOKE ALL ON TABLE public\.platform_secrets/);
assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE TABLE|DELETE FROM/);

const afripay = mustExist("lib/afripay/afripay.ts");
assert.doesNotMatch(afripay, /AFRIPAY_APP_ID \|\|/);
assert.doesNotMatch(afripay, /AFRIPAY_APP_SECRET \|\|/);
assert.match(afripay, /AFRIPAY_APP_ID or AFRIPAY_APP_SECRET is not set/);

const envExample = mustExist(".env.example");
assert.doesNotMatch(envExample, /AFRIPAY_APP_ID=.+/);
assert.match(envExample, /AFRIPAY_APP_ID=/);

const ledger = mustExist("app/api/ugc/escrow/ledger/route.ts");
assert.match(ledger, /requireBrandPermission/);
assert.match(ledger, /Escrow funding must come from a verified payment/);
assert.match(ledger, /ALLOWED_ENTRY_TYPES/);

const deposit = mustExist("app/api/ugc/campaigns/[id]/deposit/route.ts");
assert.match(deposit, /status: "pending"/);
assert.match(deposit, /Campaign activates after payment confirmation/);

const lifecycle = mustExist("lib/actions/order-lifecycle.ts");
assert.match(lifecycle, /Authentication required/);
assert.match(lifecycle, /assertPlatformAdmin/);
assert.match(lifecycle, /order\.buyer_id === user\.id/);

const flwInit = mustExist("app/api/payments/flutterwave/initiate/route.ts");
assert.match(flwInit, /requireSessionUser/);
assert.match(flwInit, /\.eq\("buyer_id", session\.user\.id\)/);

const paypalCreate = mustExist("app/api/payments/paypal/create-order/route.ts");
assert.match(paypalCreate, /requireSessionUser/);
assert.match(paypalCreate, /\.eq\("buyer_id", session\.user\.id\)/);

const paypalWh = mustExist("app/api/payments/paypal/webhook/route.ts");
assert.match(paypalWh, /PAYPAL_WEBHOOK_ID is not configured/);

const pawapayCb = mustExist("app/api/payments/pawapay/callback/route.ts");
assert.match(pawapayCb, /confirmPawaPayDepositCompleted/);
assert.doesNotMatch(pawapayCb, /Proceeding with callback/);

const pawapayLegacy = mustExist("app/api/webhook/route.ts");
assert.match(pawapayLegacy, /confirmPawaPayDepositCompleted/);

const afripayWh = mustExist("app/api/webhooks/afripay/route.ts");
assert.match(afripayWh, /checkAfriPayStatus/);

const cjWh = mustExist("app/api/webhooks/cj/route.ts");
assert.match(cjWh, /CJ_WEBHOOK_SECRET/);
assert.match(cjWh, /storedOpenId/);

const pesapalPay = mustExist("app/api/pesapal/pay/route.ts");
assert.match(pesapalPay, /requireSessionUser/);
assert.match(pesapalPay, /orderId is required/);

const nowpayInit = mustExist("app/api/payments/nowpayments/initiate/route.ts");
assert.match(nowpayInit, /requireSessionUser/);
assert.match(nowpayInit, /\.eq\('buyer_id', session\.user\.id\)/);

const nowpayCreate = mustExist("app/api/nowpayments/create/route.ts");
assert.match(nowpayCreate, /orderTotalsForUsdGateway/);
assert.match(nowpayCreate, /createServiceRoleClient/);

const cronAuth = mustExist("lib/ops/cron-auth.ts");
assert.match(cronAuth, /hosted \|\| production/);
assert.doesNotMatch(cronAuth, /searchParams\.get\(["']secret/);

const team = mustExist("app/api/ugc/team/route.ts");
assert.match(team, /requireBrandPermission/);
assert.doesNotMatch(team, /roleCan\("owner"/);

const perms = mustExist("lib/ugc/enterprise/permissions.ts");
assert.match(perms, /export async function requireBrandPermission/);
assert.match(perms, /resolveBrandRole/);

const ugcAuth = mustExist("lib/ugc/platform/auth.ts");
assert.match(ugcAuth, /user: null; db: null/);

console.log("verify-phase10-hardening: PASS");
