/**
 * Production data-access recovery checks — no network.
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

const raw = mustExist("lib/cj/premium-intelligence/catalog-repository.ts");
assert.match(raw, /export async function getRawProduct/);
assert.match(raw, /from\("cj_raw_products"\)/);
assert.match(raw, /\.select\("\*"\)/);
assert.doesNotMatch(
  raw,
  /pid, name, sku, price, stock, warehouse, orders, is_video/,
);

const feed = mustExist("app/api/posts/feed/route.ts");
assert.match(feed, /loadPublicCommunityIds/);
assert.match(feed, /is_private\.eq\.false,is_private\.is\.null/);
assert.match(feed, /membershipIds, \.\.\.publicCommunityIds/);
assert.match(feed, /if \(error\)/);
assert.doesNotMatch(feed, /\.eq\("user_id", user\.id\)\s*\n\s*\.eq\("is_published"/);

const marketplace = mustExist("lib/marketplace/fetch-page-data.ts");
assert.match(marketplace, /\[marketplace\] product count failed/);
assert.match(marketplace, /throw new Error\(countRes\.error\.message\)/);
assert.match(marketplace, /throw new Error\(dataRes\.error\.message\)/);

const homepage = mustExist("lib/marketplace/homepage-products.ts");
assert.match(homepage, /\[homepage\] product pool failed/);

const client = mustExist("components/marketplace/new/MarketplacePageClient.tsx");
assert.match(client, /browseError/);
assert.match(client, /Couldn’t load products/);
assert.match(client, /\[marketplace\] browse load failed/);

const auth = mustExist("lib/auth/sign-in-errors.ts");
assert.match(auth, /normalizeSignInEmail/);
assert.match(auth, /email_not_confirmed/);
assert.match(auth, /over_request_rate_limit/);
assert.match(auth, /Invalid login credentials/);
assert.match(auth, /oauthOnlySignInMessage/);

const actions = mustExist("lib/auth/actions.ts");
assert.match(actions, /normalizeSignInEmail/);
assert.match(actions, /messageForFailedPasswordSignIn/);
assert.match(actions, /mapSignInAuthError/);
assert.doesNotMatch(actions, /console\.(log|debug|info)\(.*password/i);

const rls = mustExist("supabase/migrations/20260821120000_public_community_read_rls.sql");
assert.match(rls, /community_posts_select_public/);
assert.match(rls, /TO anon, authenticated/);
assert.match(rls, /FOR SELECT/);
assert.doesNotMatch(rls, /FOR INSERT/);
assert.doesNotMatch(rls, /DISABLE ROW LEVEL SECURITY/);

const login = mustExist("app/(auth)/login/login-form.tsx");
assert.match(login, /type="email"/);
assert.match(login, /autoComplete="current-password"/);

console.log("verify-data-access-recovery: ok");
