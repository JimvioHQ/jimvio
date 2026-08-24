/**
 * Authentication session hardening — open-redirect, callback errors, 2FA gate.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
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

const safePath = mustExist("lib/auth/safe-path.ts");
assert.match(safePath, /export function isSafeInternalPath/);
assert.match(safePath, /startsWith\("\/\/"\)/);
assert.match(safePath, /%2f/);
assert.match(safePath, /%5c/);

const twoFa = mustExist("lib/auth/two-fa-session.ts");
assert.match(twoFa, /TWO_FA_PENDING_COOKIE/);
assert.match(twoFa, /TWO_FA_VERIFIED_COOKIE/);

const middleware = mustExist("lib/supabase/middleware.ts");
assert.match(middleware, /TWO_FA_PENDING_COOKIE/);
assert.match(middleware, /two_factor_enabled/);
assert.match(middleware, /"\/checkout"/);

const callback = mustExist("app/auth/callback/route.ts");
assert.doesNotMatch(callback, /encodeURIComponent\(exchangeError\.message\)/);
assert.doesNotMatch(callback, /encodeURIComponent\(message\)/);
assert.match(callback, /login\?error=auth_error/);
assert.match(callback, /TWO_FA_PENDING_COOKIE/);
assert.match(callback, /resolvePublicOrigin/);
assert.doesNotMatch(
  callback,
  /const origin =\s*process\.env\.NEXT_PUBLIC_APP_URL/,
);

const appUrl = mustExist("lib/app-url.ts");
assert.match(appUrl, /export function resolvePublicOrigin/);
assert.match(appUrl, /isLoopbackHost/);

const actions = mustExist("lib/auth/actions.ts");
assert.match(actions, /TWO_FA_VERIFIED_COOKIE/);
assert.match(actions, /google_signin_failed/);
assert.match(actions, /Two-factor authentication is not fully set up/);
assert.doesNotMatch(actions, /error=\$\{encodeURIComponent\(error\?\.message/);

const errors = mustExist("lib/auth/sign-in-errors.ts");
assert.match(errors, /Invalid login credentials/);
assert.match(errors, /formatLoginQueryError/);
assert.doesNotMatch(
  errors,
  /message\.length < 140[\s\S]*return message/,
);

const postLogin = mustExist("lib/auth/post-login-redirect.ts");
assert.match(postLogin, /sanitizeInternalPath/);

const redirectAuth = mustExist("lib/auth/redirect-authenticated.ts");
assert.match(redirectAuth, /TWO_FA_PENDING_COOKIE/);
assert.match(redirectAuth, /\/login\/2fa/);

console.log("verify-auth-session-hardening: ok");
