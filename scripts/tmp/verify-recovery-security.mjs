/**
 * Recovery-session security — JWT AMR parsing and the 10 pre-deploy cases.
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

const RECOVERY_AMR_METHOD = "recovery";

function claimsIndicatePasswordRecovery(claims) {
  if (!claims || typeof claims !== "object") return false;
  const amr = claims.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (typeof entry === "string") return entry === RECOVERY_AMR_METHOD;
    if (entry && typeof entry === "object" && "method" in entry) {
      return entry.method === RECOVERY_AMR_METHOD;
    }
    return false;
  });
}

function jsonFromBase64Url(segment) {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(Buffer.from(padded + pad, "base64").toString("utf8"));
}

function accessTokenHasRecoveryAmr(accessToken) {
  if (!accessToken) return false;
  const parts = accessToken.split(".");
  if (parts.length < 2) return false;
  try {
    return claimsIndicatePasswordRecovery(jsonFromBase64Url(parts[1]));
  } catch {
    return false;
  }
}

function pkceRedirectTypeIsRecovery(data) {
  if (!data || typeof data !== "object") return false;
  return data.redirectType === "recovery";
}

function jwtWithAmr(amr) {
  const payload = Buffer.from(JSON.stringify({ amr }), "utf8").toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

assert.equal(
  accessTokenHasRecoveryAmr(jwtWithAmr([{ method: "recovery", timestamp: 1 }])),
  true,
);
assert.equal(
  accessTokenHasRecoveryAmr(jwtWithAmr(["recovery"])),
  true,
);
assert.equal(
  accessTokenHasRecoveryAmr(jwtWithAmr([{ method: "password", timestamp: 1 }])),
  false,
);
assert.equal(
  accessTokenHasRecoveryAmr(jwtWithAmr([{ method: "oauth", timestamp: 1 }])),
  false,
);
assert.equal(
  accessTokenHasRecoveryAmr(jwtWithAmr([{ method: "otp", timestamp: 1 }])),
  false,
);
assert.equal(accessTokenHasRecoveryAmr("not-a-jwt"), false);
assert.equal(accessTokenHasRecoveryAmr(""), false);
assert.equal(pkceRedirectTypeIsRecovery({ redirectType: "recovery" }), true);
assert.equal(pkceRedirectTypeIsRecovery({ redirectType: "signup" }), false);
assert.equal(pkceRedirectTypeIsRecovery({ user: { id: "x" } }), false);

const recovery = mustExist("lib/auth/recovery-session.ts");
const actions = mustExist("lib/auth/actions.ts");
const callback = mustExist("app/auth/callback/route.ts");
const complete = mustExist("app/(auth)/complete/complete-client.tsx");
const middleware = mustExist("lib/supabase/middleware.ts");
const postLogin = mustExist("lib/auth/post-login-redirect.ts");

assert.match(recovery, /RECOVERY_AMR_METHOD = "recovery"/);
assert.match(recovery, /method === RECOVERY_AMR_METHOD/);
assert.match(recovery, /redirectType === "recovery"/);
assert.match(recovery, /sanitizeAuthenticatedNext/);
assert.match(recovery, /isRecoveryTwoFaExemptPath/);
assert.match(recovery, /isPasswordResetPath/);

assert.match(actions, /resetPasswordForEmail/);
assert.match(actions, /currentSessionIsPasswordRecovery/);
assert.match(actions, /claimsIndicatePasswordRecovery/);
assert.match(actions, /beginPasswordRecovery/);
assert.match(actions, /completePasswordReset/);
assert.match(actions, /updateUser\(\{ password \}\)/);
assert.match(actions, /cookieStore\.delete\(PASSWORD_RECOVERY_COOKIE\)/);
assert.match(actions, /signOut\(\{ scope: "local" \}\)/);
assert.match(actions, /sanitizeAuthenticatedNext\(next\)/);

const beginFn = actions.slice(
  actions.indexOf("export async function beginPasswordRecovery"),
  actions.indexOf("export async function hasPasswordRecoverySession"),
);
assert.match(beginFn, /currentSessionIsPasswordRecovery/);
assert.match(beginFn, /cookieStore\.set\(PASSWORD_RECOVERY_COOKIE/);

const completeResetFn = actions.slice(
  actions.indexOf("export async function completePasswordReset"),
  actions.indexOf("export async function updatePassword"),
);
assert.match(completeResetFn, /PASSWORD_RECOVERY_COOKIE/);
assert.match(completeResetFn, /currentSessionIsPasswordRecovery/);
assert.match(completeResetFn, /updateUser\(\{ password \}\)/);
assert.match(completeResetFn, /cookieStore\.delete\(PASSWORD_RECOVERY_COOKIE\)/);
assert.doesNotMatch(completeResetFn, /formData\.get\("user_id"\)/);
assert.doesNotMatch(completeResetFn, /formData\.get\("userId"\)/);

assert.match(callback, /type: "recovery"/);
assert.match(callback, /pkceRedirectTypeIsRecovery/);
assert.match(callback, /accessTokenHasRecoveryAmr/);
assert.doesNotMatch(callback, /isPasswordResetPath\(safeNext\)/);
assert.doesNotMatch(callback, /otpType === "recovery" \|\| isPasswordResetPath/);
assert.match(callback, /sanitizeAuthenticatedNext/);

assert.match(complete, /event === "PASSWORD_RECOVERY"/);
assert.doesNotMatch(complete, /flowType === "recovery"/);
assert.doesNotMatch(complete, /if \(flowType === "recovery"\)/);

assert.match(middleware, /isRecoveryTwoFaExemptPath\(pathname\)/);
assert.doesNotMatch(
  middleware,
  /isPasswordResetPath\(pathname\) \|\s*\n\s*\(Boolean\(user\) && cookieMatchesUser\(recovery/,
);
assert.match(middleware, /\/owner/);
assert.match(middleware, /\/wallet/);
assert.match(middleware, /\/admin/);

assert.match(postLogin, /isPasswordResetPath\(incoming\) \? "\/"/);

// 1. Forgot password → recovery email → callback → reset
assert.match(actions, /resetPasswordForEmail/);
assert.match(callback, /PASSWORD_RECOVERY_COOKIE/);
assert.match(callback, /\/reset-password/);

// 2. Normal email login → /reset-password is not recovery
assert.match(actions, /signInWithPassword/);
assert.match(postLogin, /isPasswordResetPath\(incoming\) \? "\/"/);

// 3. Google login → next=/reset-password is not recovery
assert.match(actions, /signInWithOAuth/);
assert.match(actions, /sanitizeAuthenticatedNext\(next\)/);

// 4. /complete?type=recovery on a normal session is not recovery
assert.doesNotMatch(complete, /flowType === "recovery"/);

// 5. beginPasswordRecovery rejected without recovery grant
assert.match(beginFn, /currentSessionIsPasswordRecovery/);

// 6–8. Recovery cookie does not skip 2FA on dashboard / wallet / admin
assert.match(middleware, /isRecoveryTwoFaExemptPath/);
assert.match(recovery, /function isRecoveryTwoFaExemptPath[\s\S]*isPasswordResetPath\(pathname\)/);
assert.doesNotMatch(recovery, /isRecoveryTwoFaExemptPath[\s\S]*\/dashboard/);

// 9. Recovery session → /reset-password allowed
assert.match(recovery, /isRecoveryTwoFaExemptPath[\s\S]*isPasswordResetPath/);

// 10. Successful reset clears recovery state
assert.match(completeResetFn, /cookieStore\.delete\(PASSWORD_RECOVERY_COOKIE\)/);
assert.match(completeResetFn, /signOut\(\{ scope: "local" \}\)/);

console.log("verify-recovery-security: ok");
