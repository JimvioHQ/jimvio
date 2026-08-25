/**
 * Phase 6 — user_roles self-grant + platform_settings SELECT lock.
 * Static / negative authorization proofs. Does not create users or touch production data.
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

function listTsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "types") continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) listTsFiles(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(name)) acc.push(full);
  }
  return acc;
}

const schema = mustExist("schema.sql");
const dbMig = mustExist("database/migrations/129_lock_user_roles_and_platform_settings.sql");
const sbMig = mustExist("supabase/migrations/20260825020000_lock_user_roles_and_platform_settings.sql");

// ── Proven pre-state in dumped schema (unsafe) ─────────────────────────────
assert.match(
  schema,
  /CREATE POLICY "user_roles_insert" ON "public"\."user_roles" FOR INSERT WITH CHECK \(\("auth"\."uid"\(\) = "user_id"\)\)/,
);
assert.match(
  schema,
  /CREATE POLICY "user_roles_update" ON "public"\."user_roles" FOR UPDATE USING \(\("auth"\."uid"\(\) = "user_id"\)\)/,
);
assert.match(
  schema,
  /CREATE POLICY "user_roles_delete" ON "public"\."user_roles" FOR DELETE USING \(\("auth"\."uid"\(\) = "user_id"\)\)/,
);
assert.match(schema, /GRANT ALL ON TABLE "public"\."user_roles" TO "anon"/);
assert.match(schema, /GRANT ALL ON TABLE "public"\."user_roles" TO "authenticated"/);
assert.match(
  schema,
  /CREATE POLICY "platform_settings_select" ON "public"\."platform_settings" FOR SELECT USING \(true\)/,
);
assert.match(schema, /GRANT ALL ON TABLE "public"\."platform_settings" TO "anon"/);

// Enum has buyer, not user. Privileged value is admin only.
assert.match(schema, /CREATE TYPE "public"\."user_role" AS ENUM/);
assert.match(schema, /'buyer'/);
assert.match(schema, /'admin'/);
assert.doesNotMatch(schema, /'super_admin'/);
assert.doesNotMatch(schema, /'user'/);

// Signup provisions buyer via SECURITY DEFINER — not client-chosen.
assert.match(
  schema,
  /INSERT INTO public\.user_roles \(user_id, role\)\s+VALUES \(NEW\.id, 'buyer'\)/,
);

// ── Fix migration: fail closed ─────────────────────────────────────────────
for (const sql of [dbMig, sbMig]) {
  const active = sql
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n");
  assert.match(sql, /DROP POLICY IF EXISTS user_roles_insert/);
  assert.match(sql, /DROP POLICY IF EXISTS user_roles_update/);
  assert.match(sql, /DROP POLICY IF EXISTS user_roles_delete/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.user_roles FROM anon/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.user_roles FROM authenticated/);
  assert.match(sql, /GRANT SELECT ON TABLE public\.user_roles TO authenticated/);
  assert.match(sql, /reject_client_user_roles_write/);
  assert.match(sql, /jwt_role IN \('anon', 'authenticated'\)/);
  assert.match(sql, /DROP POLICY IF EXISTS platform_settings_select/);
  assert.match(sql, /platform_settings_select_public_allowlist/);
  assert.match(sql, /'fees'/);
  assert.match(sql, /'contact'/);
  assert.match(sql, /'payment_providers'/);
  assert.doesNotMatch(active, /USING\s*\(\s*true\s*\)/i);
  assert.doesNotMatch(active, /cj_credentials/);
  assert.doesNotMatch(active, /role\s*=\s*'admin'/);
  assert.doesNotMatch(active, /INSERT INTO public\.user_roles/);
}

// ── Server-side provisioning paths ─────────────────────────────────────────
const provision = mustExist("lib/auth/provision-nonprivileged-role.ts");
assert.match(provision, /CLAIMABLE_USER_ROLES/);
assert.match(provision, /"vendor"/);
assert.match(provision, /createAdminClient/);
assert.match(provision, /That role cannot be self-provisioned/);
assert.doesNotMatch(
  provision,
  /CLAIMABLE_USER_ROLES\s*=\s*\[[^\]]*(admin|super_admin)/,
);

const activateVendor = mustExist("lib/actions/activate-vendor-role.ts");
assert.match(activateVendor, /provisionOwnNonPrivilegedRole\("vendor"\)/);
assert.doesNotMatch(activateVendor, /role:\s*["']admin["']/);

const account = mustExist("lib/actions/account-settings.ts");
assert.match(account, /provisionOwnNonPrivilegedRole\(role\)/);
assert.match(account, /activateUserRole\(\s*role: "affiliate" \| "influencer"/);
assert.match(account, /createAdminClient/);
assert.match(account, /\.neq\("role", "admin"\)/);
assert.doesNotMatch(account, /from\("user_roles"\)\.upsert/);

const recover = mustExist("supabase/migrations/20260824021611_recover_orphan_auth_profiles_v3.sql");
assert.match(recover, /VALUES \(p_auth_user_id, 'buyer'\)/);
assert.match(recover, /GRANT EXECUTE[\s\S]*TO service_role/);
assert.match(recover, /REVOKE ALL[\s\S]*FROM authenticated/);

const getSettings = mustExist("lib/actions/security.ts");
assert.match(getSettings, /ADMIN_PLATFORM_SETTING_KEYS/);
assert.match(getSettings, /createAdminClient/);
assert.match(getSettings, /eq\('is_active', true\)/);
assert.doesNotMatch(getSettings, /from\('platform_settings'\)\.select\('key, value'\)\s*\n\s*if \(error/);

const access = mustExist("lib/security/platform-settings-access.ts");
assert.match(access, /PUBLIC_PLATFORM_SETTING_KEYS/);
assert.match(access, /isSensitivePlatformSettingKey/);
assert.ok(access.includes("credential"), "sensitive detector must cover credentials");
const publicBlock = access.slice(
  access.indexOf("PUBLIC_PLATFORM_SETTING_KEYS"),
  access.indexOf("] as const"),
);
assert.doesNotMatch(publicBlock, /cj_credentials/);
assert.doesNotMatch(publicBlock, /sessions:/);

const publicSettings = mustExist("lib/platform-settings-server.ts");
assert.match(publicSettings, /PUBLIC_PLATFORM_SETTING_KEYS/);

// ── Client must not write user_roles ───────────────────────────────────────
const clientWriteRe =
  /from\(\s*["']user_roles["']\s*\)\s*\.\s*(insert|upsert|update|delete)\s*\(/;
const allowedWriteRel = new Set([
  path.join(root, "lib/auth/provision-nonprivileged-role.ts"),
  path.join(root, "lib/actions/admin-users.ts"),
  path.join(root, "lib/actions/admin-vendors.ts"),
  path.join(root, "lib/actions/account-settings.ts"),
  path.join(root, "app/api/ugc/campaigns/route.ts"),
]);

for (const file of listTsFiles(root)) {
  const src = fs.readFileSync(file, "utf8");
  if (!clientWriteRe.test(src)) continue;
  assert.ok(
    allowedWriteRel.has(file),
    `unexpected user_roles write in ${path.relative(root, file)}`,
  );
  if (file.endsWith("app/api/ugc/campaigns/route.ts")) {
    assert.match(src, /createServiceRoleClient|requireUser/);
    assert.match(src, /role:\s*'vendor'/);
    assert.doesNotMatch(src, /role:\s*'admin'/);
  }
  if (file.endsWith("lib/actions/account-settings.ts")) {
    assert.match(src, /createAdminClient/);
    assert.match(src, /\.neq\("role", "admin"\)/);
  }
}

const vendorSetup = mustExist("app/dashboard/vendor/setup/page.tsx");
const vendorActivate = mustExist("app/dashboard/activate/vendor/page.tsx");
for (const src of [vendorSetup, vendorActivate]) {
  assert.match(src, /activateVendorRole/);
  assert.doesNotMatch(src, /from\("user_roles"\)\.upsert/);
}

// ── Admin actions must not trust client role ───────────────────────────────
const adminVendors = mustExist("lib/actions/admin-vendors.ts");
assert.match(adminVendors, /assertAdminAccess/);
assert.match(adminVendors, /requireAdminAction/);

const superAdmin = mustExist("lib/cj/premium-intelligence/super-admin-auth.ts");
assert.match(superAdmin, /eq\("is_active", true\)/);

const requirePlatform = mustExist("lib/ops/require-platform-admin.ts");
assert.match(requirePlatform, /eq\("is_active", true\)/);
assert.match(requirePlatform, /role === "admin"/);

// ── Negative: helper cannot be pointed at admin ────────────────────────────
const claimableMatch = provision.match(
  /CLAIMABLE_USER_ROLES = \[([\s\S]*?)\] as const/,
);
assert.ok(claimableMatch, "CLAIMABLE_USER_ROLES array missing");
const claimable = [...claimableMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.ok(claimable.includes("vendor"));
assert.ok(claimable.includes("affiliate"));
assert.ok(claimable.includes("influencer"));
assert.ok(!claimable.includes("admin"));
assert.ok(!claimable.includes("super_admin"));
assert.ok(!claimable.includes("buyer"));

console.log("verify-phase6-user-roles-platform-settings: ok");
