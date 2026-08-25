/**
 * Phase 8 privilege lockdown — static/unit checks.
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

const adminCj = mustExist("lib/actions/admin-cj.ts");
const ordersActions = mustExist("lib/actions/orders.ts");
const autoHeal = mustExist("lib/actions/auto-heal-transaction.ts");
const inventoryMgmt = mustExist("lib/actions/inventory-management.ts");
const platformAdmin = mustExist("lib/auth/platform-admin.ts");
const clientTs = mustExist("lib/supabase/client.ts");
const serviceRole = mustExist("lib/supabase/service-role.ts");
const publicEnv = mustExist("lib/supabase/public-env.ts");
const provision = mustExist("lib/auth/provision-nonprivileged-role.ts");
const bulkDelete = mustExist("app/api/admin/products/bulk-delete/route.ts");
const shopifySync = mustExist("services/shopifyProductSync.ts");
const cronShopify = mustExist("app/api/cron/shopify-sync/route.ts");
const cronShopify2 = mustExist("app/api/cron/sync-shopify-products/route.ts");
const retryCredit = mustExist("app/api/admin/orders/[orderId]/retry-credit/route.ts");
const shipping = mustExist("app/api/products/[id]/shipping/route.ts");
const migration = mustExist("database/migrations/130_lock_privileged_wallet_rpcs.sql");
const migrationTwin = mustExist("supabase/migrations/20260825080000_lock_privileged_wallet_rpcs.sql");
const limits = mustExist("lib/security/destructive-limits.ts");
const adminLayout = mustExist("app/admin/layout.tsx");
const adminShell = mustExist("components/admin/admin-app-shell.tsx");
const cronAuth = mustExist("lib/ops/cron-auth.ts");

assert.equal(stripSqlComments(migration), stripSqlComments(migrationTwin), "migration twins must match");

// 1–3. Privileged CJ actions require server-side platform admin before service-role.
assert.match(adminCj, /assertPlatformAdmin/);
assert.match(adminCj, /async function requireAdminCj/);
assert.match(adminCj, /getAdminDB\(\)/);
const beforeDb = adminCj.split("export async function retryCJSubmission")[1]?.split("getAdminDB()")[0] ?? "";
assert.match(beforeDb, /requireAdminCj/);
assert.match(beforeDb, /if \(!gate\.ok\) return gate\.result/);
assert.match(adminCj, /export async function sendToCJNow/);
assert.match(adminCj, /export async function syncOneCJOrder/);
assert.match(adminCj, /export async function getCJLogsForOrder/);
assert.match(platformAdmin, /supabase\.auth\.getUser\(\)/);
assert.match(platformAdmin, /\.eq\("is_active", true\)/);
assert.match(platformAdmin, /ADMIN_EMAILS/);
assert.match(platformAdmin, /Request body, query, localStorage, and client props are never used/);
const assertBody = platformAdmin.slice(
  platformAdmin.indexOf("export async function assertPlatformAdmin"),
  platformAdmin.indexOf("export async function requirePlatformAdmin"),
);
assert.doesNotMatch(assertBody, /req\.json|searchParams|localStorage|body\.email/);

// 3. Admin can still call the actions (functions remain exported).
for (const name of ["retryCJSubmission", "sendToCJNow", "syncOneCJOrder", "getCJLogsForOrder"]) {
  assert.match(adminCj, new RegExp(`export async function ${name}`));
}

// 4. Browser client must not import the service-role module.
assert.doesNotMatch(clientTs, /service-role/);
assert.match(clientTs, /public-env/);
assert.match(serviceRole, /getSupabaseSecretKey is server-only/);
assert.match(mustExist("lib/supabase/admin.ts"), /import ["']server-only["']/);
assert.doesNotMatch(mustExist("lib/cj/import-intelligence/api.ts"), /catalog-filter-index/);
assert.doesNotMatch(publicEnv, /SERVICE_ROLE|SECRET_KEY/);
assert.doesNotMatch(publicEnv, /ANON_KEY/);
assert.doesNotMatch(mustExist("lib/live/env.ts"), /NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_ANON_KEY/);

// 5. Wallet mutation RPC is not executable by ordinary clients after migration.
assert.match(migration, /REVOKE ALL ON FUNCTION public\.increment_wallet_balance/);
assert.match(migration, /FROM PUBLIC/);
assert.match(migration, /FROM authenticated/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.increment_wallet_balance\(uuid, numeric\) TO service_role/);
assert.match(migration, /SET search_path TO 'public'/);
assert.match(migration, /jwt_role IS DISTINCT FROM 'service_role'/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.add_video_earnings/);

// 6. Admin role cannot be self-claimed.
assert.match(provision, /CLAIMABLE_USER_ROLES/);
assert.match(provision, /PRIVILEGED_USER_ROLES/);
assert.match(provision, /"admin"/);
assert.match(provision, /isPrivilegedUserRole/);
assert.doesNotMatch(provision, /CLAIMABLE_USER_ROLES = \[[^\]]*admin/);
assert.match(provision, /That role cannot be self-provisioned/);

const claimableBlock = provision.slice(
  provision.indexOf("export const CLAIMABLE_USER_ROLES"),
  provision.indexOf("export type ClaimableUserRole"),
);
assert.doesNotMatch(claimableBlock, /admin/);
assert.match(claimableBlock, /vendor/);
assert.match(claimableBlock, /affiliate/);
assert.match(claimableBlock, /influencer/);
assert.match(claimableBlock, /community_owner/);

// 7. Privileged APIs reject arbitrary IDs.
assert.match(adminCj, /isUuid\(orderId\)/);
assert.match(retryCredit, /isUuid\(orderId\)/);
assert.match(shipping, /isUuid\(productId\)/);
assert.match(bulkDelete, /ids\.some\(\(id\) => !isUuid\(id\)\)/);

// 8. Cron / admin machine routes no longer trust query-string secrets.
assert.doesNotMatch(cronShopify, /searchParams\.get\(["']secret["']\)/);
assert.doesNotMatch(cronShopify2, /searchParams\.get\(["']secret["']\)/);
assert.match(cronShopify, /assertCronAuthorized/);
assert.match(cronShopify2, /assertCronAuthorized/);
assert.match(retryCredit, /requireAdminSessionOrCron/);
assert.doesNotMatch(retryCredit, /x-admin-key/);
assert.match(cronAuth, /x-cron-secret/);
assert.doesNotMatch(cronAuth, /searchParams/);

// 9. Product bulk deletion requires admin + bounded scope.
assert.match(limits, /MAX_BULK_PRODUCT_DELETE = 50/);
assert.match(bulkDelete, /requirePlatformAdmin/);
assert.match(bulkDelete, /MAX_BULK_PRODUCT_DELETE/);
assert.match(bulkDelete, /selectAll/);
assert.match(bulkDelete, /Unbounded or arbitrary delete is not allowed/);
assert.match(shopifySync, /Soft-archive only/);
assert.doesNotMatch(
  shopifySync.slice(shopifySync.indexOf("async function cleanupMissingProducts")),
  /\.delete\(\)/,
);

// 10. CJ credentials never appear in shipping client output.
assert.doesNotMatch(shipping, /accessToken|api_key|refresh_token/);
assert.match(shipping, /getOrRefreshAccessToken/);
assert.match(shipping, /if \(!user\)/);
assert.match(shipping, /source: "cached"/);
assert.doesNotMatch(shipping, /NextResponse\.json\([^\)]*token/i);

// Sibling admin Server Actions that mutate orders / credits also require platform admin.
assert.match(ordersActions, /export async function resolveFailedCreditAction/);
assert.match(ordersActions, /export async function retryCJOrderAction/);
const resolveBody = ordersActions.slice(
  ordersActions.indexOf("export async function resolveFailedCreditAction"),
  ordersActions.indexOf("export async function retryCJOrderAction"),
);
assert.match(resolveBody.split("getAdminDB()")[0] ?? "", /assertPlatformAdmin/);
assert.match(resolveBody, /isUuid/);
const retryBody = ordersActions.slice(ordersActions.indexOf("export async function retryCJOrderAction"));
assert.match(retryBody.split("handleCJFulfillment")[0] ?? "", /assertPlatformAdmin/);
assert.match(retryBody, /isUuid/);

const healBeforeDb = autoHeal.split("getAdminDB()")[0] ?? "";
assert.match(healBeforeDb, /assertPlatformAdmin/);
assert.match(healBeforeDb, /isUuid/);
assert.doesNotMatch(inventoryMgmt, /^["']use server["']/m);

// Layout is server-authorized; chrome uses the server session action.
assert.doesNotMatch(adminLayout, /["']use client["']/);
assert.match(adminLayout, /assertPlatformAdmin/);
assert.match(adminShell, /getPlatformAdminSession/);

// get_user_roles cannot enumerate other users from anon/client.
assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM lookup_user_id/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_user_roles\(uuid\) FROM anon/);
assert.match(migration, /REVOKE ALL ON TABLE public\.platform_secrets FROM anon/);

// Migration must not mutate application data or Auth users.
const sqlNoComments = stripSqlComments(migration);
assert.doesNotMatch(sqlNoComments, /\bTRUNCATE TABLE\b/i);
assert.doesNotMatch(sqlNoComments, /^\s*DELETE FROM\b/im);
assert.doesNotMatch(sqlNoComments, /auth\.users/);
assert.doesNotMatch(sqlNoComments, /\bDROP TABLE\b/i);
assert.match(migration, /Does NOT/);

console.log("verify-phase8-privilege-lockdown: ok");
