/**
 * Phase 6 migration contract — user_roles + platform_settings.
 * Parses the SQL end state. Does not connect to production or create users.
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

function normalizeSql(sql) {
  return stripSqlComments(sql).replace(/\s+/g, " ").trim();
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

function parseDroppedPolicies(sql, table) {
  const names = [];
  const re = new RegExp(
    `DROP POLICY IF EXISTS\\s+("([^"]+)"|([a-zA-Z0-9_]+))\\s+ON public\\.${table}`,
    "g",
  );
  for (const m of sql.matchAll(re)) names.push(m[2] || m[3]);
  return names;
}

function parseCreatedPolicies(sql) {
  const policies = [];
  const re =
    /CREATE POLICY\s+(\w+)\s+ON public\.(\w+)\s+FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)\s+TO\s+([^\n]+?)\s+(USING|WITH CHECK)\s*\(([\s\S]*?)\);/g;
  for (const m of sql.matchAll(re)) {
    const clause = m[5];
    const body = m[6].replace(/\s+/g, " ").trim();
    policies.push({
      name: m[1],
      table: m[2],
      command: m[3],
      roles: m[4].trim(),
      using: clause === "USING" ? body : null,
      withCheck: clause === "WITH CHECK" ? body : null,
    });
  }
  return policies;
}

function simulateGrants(statements, table) {
  const roles = {
    anon: new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]),
    authenticated: new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]),
    service_role: new Set(["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]),
  };
  for (const stmt of statements) {
    const revoke = stmt.match(
      new RegExp(`REVOKE ALL ON TABLE public\\.${table} FROM (anon|authenticated)`),
    );
    if (revoke) roles[revoke[1]] = new Set();
    const grantSelect = stmt.match(
      new RegExp(`GRANT SELECT ON TABLE public\\.${table} TO (anon|authenticated)`),
    );
    if (grantSelect) roles[grantSelect[1]].add("SELECT");
    const grantAll = stmt.match(
      new RegExp(`GRANT ALL ON TABLE public\\.${table} TO (anon|authenticated|service_role)`),
    );
    if (grantAll) {
      roles[grantAll[1]] = new Set([
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
      ]);
    }
  }
  return roles;
}

function jwtWriteAllowed(jwtRole) {
  return !["anon", "authenticated"].includes(jwtRole);
}

const EXPECTED_PUBLIC_KEYS = [
  "fees",
  "social_proof",
  "marketing",
  "contact",
  "payment_providers",
];
const FORBIDDEN_PUBLIC_KEYS = [
  "cj_credentials",
  "sessions:00000000-0000-0000-0000-000000000000",
  "features",
  "supplier_sources",
  "defaults",
  "security",
  "fraud",
  "cj_vendor_id",
  "cj_last_sync",
];

const schema = mustExist("schema.sql");
const dbMig = mustExist("database/migrations/129_lock_user_roles_and_platform_settings.sql");
const sbMig = mustExist("supabase/migrations/20260825020000_lock_user_roles_and_platform_settings.sql");

assert.equal(
  normalizeSql(dbMig),
  normalizeSql(sbMig),
  "database/ and supabase/ copies must have the same active SQL",
);

const active = stripSqlComments(sbMig);

assert.doesNotMatch(active, /\bDELETE FROM\b/i);
assert.doesNotMatch(active, /\bUPDATE\s+public\./i);
assert.doesNotMatch(active, /\bDROP TABLE\b/i);
assert.doesNotMatch(active, /\bDROP COLUMN\b/i);
assert.doesNotMatch(active, /\bTRUNCATE\b/i);
assert.doesNotMatch(active, /\bALTER TABLE\b/i);
assert.doesNotMatch(active, /auth\.users/i);
assert.doesNotMatch(active, /\bINSERT INTO\b/i);

// Live-dumped unsafe pre-state still present in schema.sql
assert.match(
  schema,
  /CREATE POLICY "user_roles_insert" ON "public"\."user_roles" FOR INSERT WITH CHECK \(\("auth"\."uid"\(\) = "user_id"\)\)/,
);
assert.match(
  schema,
  /CREATE POLICY "platform_settings_select" ON "public"\."platform_settings" FOR SELECT USING \(true\)/,
);

const enumBlock = schema.slice(
  schema.indexOf('CREATE TYPE "public"."user_role" AS ENUM'),
  schema.indexOf(");", schema.indexOf('CREATE TYPE "public"."user_role" AS ENUM')) + 2,
);
assert.match(enumBlock, /'buyer'/);
assert.match(enumBlock, /'vendor'/);
assert.match(enumBlock, /'admin'/);
assert.doesNotMatch(enumBlock, /'user'/);
assert.doesNotMatch(enumBlock, /'super_admin'/);

assert.match(
  schema,
  /INSERT INTO public\.user_roles \(user_id, role\)\s+VALUES \(NEW\.id, 'buyer'\)/,
);

for (const name of [
  "user_roles_insert",
  "user_roles_update",
  "user_roles_delete",
  "user_roles_select",
  "user_roles_select_own",
  "users_manage_own_roles",
  "platform_settings_select",
  "platform_settings_select_public",
]) {
  assert.match(active, new RegExp(`DROP POLICY IF EXISTS\\s+("${name}"|${name})`));
}

const remaining = parseCreatedPolicies(active);
assert.equal(remaining.length, 2, `expected 2 created policies, got ${remaining.map((p) => p.name)}`);

const roleSelect = remaining.find((p) => p.name === "user_roles_select_own");
assert.ok(roleSelect, "user_roles_select_own missing");
assert.equal(roleSelect.table, "user_roles");
assert.equal(roleSelect.command, "SELECT");
assert.equal(roleSelect.roles, "authenticated");
assert.equal(roleSelect.using, "user_id = auth.uid()");
assert.equal(roleSelect.withCheck, null);
assert.doesNotMatch(roleSelect.using, /true/);

const settingsSelect = remaining.find((p) => p.name === "platform_settings_select_public_allowlist");
assert.ok(settingsSelect, "allowlist policy missing");
assert.equal(settingsSelect.table, "platform_settings");
assert.equal(settingsSelect.command, "SELECT");
assert.match(settingsSelect.roles, /anon/);
assert.match(settingsSelect.roles, /authenticated/);
assert.equal(settingsSelect.withCheck, null);
assert.doesNotMatch(settingsSelect.using, /\btrue\b/);
assert.doesNotMatch(settingsSelect.using, /auth\.uid\(\)\s*=\s*user_id/);

const allowlistKeys = [...settingsSelect.using.matchAll(/'([^']+)'/g)].map((m) => m[1]);
assert.deepEqual(allowlistKeys.sort(), [...EXPECTED_PUBLIC_KEYS].sort());
for (const key of FORBIDDEN_PUBLIC_KEYS) {
  assert.ok(!allowlistKeys.includes(key.split(":")[0]) || !allowlistKeys.includes(key));
  assert.ok(
    !allowlistKeys.some((k) => key === k || key.startsWith(`${k}:`)),
    `allowlist must not include ${key}`,
  );
}

assert.equal(
  remaining.filter((p) => ["INSERT", "UPDATE", "DELETE", "ALL"].includes(p.command)).length,
  0,
  "no write policies may remain",
);
assert.equal(
  remaining.filter((p) => p.using === "true" || /\btrue\b/.test(p.using) && !p.using.includes("key")).length,
  0,
);

const statements = active
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
const userRoleGrants = simulateGrants(statements, "user_roles");
assert.deepEqual([...userRoleGrants.anon], []);
assert.deepEqual([...userRoleGrants.authenticated], ["SELECT"]);
assert.ok(userRoleGrants.service_role.has("INSERT"));
assert.ok(userRoleGrants.service_role.has("UPDATE"));
assert.ok(userRoleGrants.service_role.has("DELETE"));
assert.ok(userRoleGrants.service_role.has("SELECT"));

const settingsGrants = simulateGrants(statements, "platform_settings");
assert.deepEqual([...settingsGrants.anon], ["SELECT"]);
assert.deepEqual([...settingsGrants.authenticated], ["SELECT"]);
assert.ok(settingsGrants.service_role.has("INSERT"));
assert.ok(!settingsGrants.anon.has("INSERT"));
assert.ok(!settingsGrants.authenticated.has("UPDATE"));

assert.match(active, /SECURITY DEFINER/);
assert.match(active, /SET search_path TO 'public'/);
assert.match(active, /auth\.jwt\(\)/);
assert.match(active, /jwt_role IN \('anon', 'authenticated'\)/);
assert.match(active, /REVOKE ALL ON FUNCTION public\.reject_client_user_roles_write\(\) FROM PUBLIC/);
assert.match(active, /GRANT EXECUTE ON FUNCTION public\.reject_client_user_roles_write\(\) TO postgres/);
assert.match(active, /GRANT EXECUTE ON FUNCTION public\.reject_client_user_roles_write\(\) TO service_role/);
assert.doesNotMatch(active, /GRANT EXECUTE ON FUNCTION public\.reject_client_user_roles_write\(\) TO (anon|authenticated|PUBLIC)/);
assert.doesNotMatch(active, /\bformat\s*\(/);
assert.doesNotMatch(active, /GRANT ALL ON TABLE public\.(user_roles|platform_settings) TO (anon|authenticated)/);
assert.match(active, /DROP POLICY IF EXISTS platform_settings_select ON public\.platform_settings/);
assert.match(active, /DROP POLICY IF EXISTS user_roles_insert ON public\.user_roles/);
assert.doesNotMatch(active, /WITH CHECK\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/);
assert.doesNotMatch(active, /FOR INSERT/);
assert.doesNotMatch(active, /FOR UPDATE/);
assert.doesNotMatch(active, /FOR DELETE/);
assert.doesNotMatch(active, /FOR ALL/);

assert.equal(jwtWriteAllowed("anon"), false);
assert.equal(jwtWriteAllowed("authenticated"), false);
assert.equal(jwtWriteAllowed("service_role"), true);
assert.equal(jwtWriteAllowed(""), true);
assert.equal(jwtWriteAllowed("postgres"), true);

const droppedUser = parseDroppedPolicies(active, "user_roles");
assert.ok(droppedUser.includes("user_roles_insert"));
assert.ok(droppedUser.includes("user_roles_update"));
assert.ok(droppedUser.includes("user_roles_delete"));

const provision = mustExist("lib/auth/provision-nonprivileged-role.ts");
const claimableMatch = provision.match(/CLAIMABLE_USER_ROLES = \[([\s\S]*?)\] as const/);
assert.ok(claimableMatch);
const claimable = [...claimableMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(claimable.sort(), ["affiliate", "community_owner", "influencer", "vendor"].sort());
assert.ok(!claimable.includes("admin"));
assert.ok(!claimable.includes("buyer"));
assert.ok(!claimable.includes("user"));
assert.match(provision, /createAdminClient/);

const activateVendor = mustExist("lib/actions/activate-vendor-role.ts");
assert.match(activateVendor, /provisionOwnNonPrivilegedRole\("vendor"\)/);

const account = mustExist("lib/actions/account-settings.ts");
assert.match(account, /activateUserRole\(\s*role: "affiliate" \| "influencer"/);
assert.match(account, /provisionOwnNonPrivilegedRole\(role\)/);
assert.match(account, /\.neq\("role", "admin"\)/);

const recover = mustExist("supabase/migrations/20260824021611_recover_orphan_auth_profiles_v3.sql");
assert.match(recover, /VALUES \(p_auth_user_id, 'buyer'\)/);
assert.match(recover, /REVOKE ALL[\s\S]*FROM authenticated/);
assert.match(recover, /GRANT EXECUTE[\s\S]*TO service_role/);

const getSettings = mustExist("lib/actions/security.ts");
assert.match(getSettings, /ADMIN_PLATFORM_SETTING_KEYS/);
assert.match(getSettings, /createAdminClient/);

const access = mustExist("lib/security/platform-settings-access.ts");
const publicBlock = access.slice(
  access.indexOf("PUBLIC_PLATFORM_SETTING_KEYS"),
  access.indexOf("] as const"),
);
const publicKeys = [...publicBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
assert.deepEqual(publicKeys.sort(), [...EXPECTED_PUBLIC_KEYS].sort());

function isSensitivePlatformSettingKey(key) {
  return /(credential|secret|token|api_key|^sessions:|activity_log_|favorite_|collection_|item_collection_)/i.test(
    key,
  );
}
function isPublicPlatformSettingKey(key) {
  return EXPECTED_PUBLIC_KEYS.includes(key);
}
for (const key of EXPECTED_PUBLIC_KEYS) {
  assert.equal(isPublicPlatformSettingKey(key), true, `${key} must be public`);
}
for (const key of FORBIDDEN_PUBLIC_KEYS) {
  assert.equal(isPublicPlatformSettingKey(key), false, `${key} must not be public`);
}
assert.equal(isSensitivePlatformSettingKey("cj_credentials"), true);
assert.equal(isSensitivePlatformSettingKey("sessions:abc"), true);
assert.equal(isSensitivePlatformSettingKey("fees"), false);
assert.equal(isSensitivePlatformSettingKey("contact"), false);

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
  if (file.includes("scripts/tmp/verify-phase6")) continue;
  if (!clientWriteRe.test(src)) continue;
  assert.ok(allowedWriteRel.has(file), `unexpected user_roles write in ${path.relative(root, file)}`);
}

for (const rel of ["app/activate/vendor/page.tsx", "app/activate/vendor/page.tsx"]) {
  const src = mustExist(rel);
  assert.match(src, /activateVendorRole/);
  assert.doesNotMatch(src, /from\("user_roles"\)\.upsert/);
}

const adminUsers = mustExist("lib/actions/admin-users.ts");
assert.match(adminUsers, /role === "admin"/);
assert.match(adminUsers, /isPrivilegedUserRole\(role\)/);
assert.match(adminUsers, /Admin role cannot be changed from this panel/);
assert.match(adminUsers, /getAdminDB/);

console.log("verify-phase6-user-roles-platform-settings: ok");
