/**
 * Auth lifecycle hardening — static checks for the unified Email + Google account.
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

function mustNotContain(source, pattern, label) {
  assert.doesNotMatch(source, pattern, label);
}

const actions = mustExist("lib/auth/actions.ts");
const errors = mustExist("lib/auth/sign-in-errors.ts");
const callback = mustExist("app/auth/callback/route.ts");
const reset = mustExist("app/(auth)/reset-password/reset-password-client.tsx");
const forgot = mustExist("app/(auth)/forgot-password/forgot-password-form.tsx");
const login = mustExist("app/(auth)/login/login-form.tsx");
const register = mustExist("app/(auth)/register/register-form.tsx");
const googleBtn = mustExist("components/auth/google-button.tsx");
const middleware = mustExist("lib/supabase/middleware.ts");
const postLogin = mustExist("lib/auth/post-login-redirect.ts");
const profile = mustExist("lib/auth/ensure-user-profile.ts");
const recovery = mustExist("lib/auth/recovery-session.ts");
const passwordRules = mustExist("lib/auth/password-rules.ts");
const security = mustExist("lib/actions/security.ts");
const account = mustExist("lib/actions/account-settings.ts");
const securityForm = mustExist("components/security/security-form.tsx");
const settings = mustExist("components/dashboard/settings/dashboard-settings-client.tsx");
const client = mustExist("lib/supabase/client.ts");
const publicEnv = mustExist("lib/supabase/public-env.ts");
const verifyPage = mustExist("app/(auth)/verify/verify-client.tsx");
const complete = mustExist("app/(auth)/complete/complete-client.tsx");

// A. Email signup
assert.match(actions, /supabase\.auth\.signUp/);
assert.match(actions, /isValidAuthEmail/);
assert.match(actions, /validateNewPassword/);
assert.match(actions, /isUnconfirmedDuplicateSignUp/);
assert.match(actions, /Check your email to confirm/);

// B. Email confirmation
assert.match(actions, /resendSignUpConfirmation/);
assert.match(actions, /type: "signup"/);
assert.match(callback, /verifyOtp/);
assert.match(callback, /token_hash/);
assert.match(verifyPage, /Email verified/);
assert.match(verifyPage, /Already verified/);
assert.match(verifyPage, /Link expired/);
assert.match(verifyPage, /Try again/);

// C–D. Email login / wrong password
assert.match(actions, /signInWithPassword/);
assert.match(errors, /Invalid email or password/);
assert.match(errors, /invalid login credentials/);
assert.match(errors, /Please verify your email before signing in/);
assert.match(login, /autoComplete="current-password"/);

// E. Google login
assert.match(actions, /signInWithOAuth/);
assert.match(actions, /skipBrowserRedirect: true/);
assert.match(googleBtn, /Continue with Google/);
assert.match(login, /GoogleAuthButton/);
assert.match(register, /GoogleAuthButton/);

// F. Existing email + Google
assert.match(errors, /isUnconfirmedDuplicateSignUp/);
assert.match(actions, /getUserIdentities/);
assert.match(actions, /linkIdentity/);
assert.match(callback, /identity_exists/);

// G–H. Forgot password / recovery callback
assert.match(actions, /resetPasswordForEmail/);
assert.match(actions, /GENERIC_RESET_SENT/);
assert.match(errors, /If an account exists for that email/);
assert.match(forgot, /Forgot password\?/);
mustNotContain(forgot, /does not exist/i, "forgot-password must not enumerate missing emails");
mustNotContain(actions, /This email exists/, "reset must not enumerate");
assert.match(callback, /otpType === "recovery"/);
assert.match(callback, /type: "recovery"/);
assert.match(callback, /pkceRedirectTypeIsRecovery/);
assert.match(callback, /accessTokenHasRecoveryAmr/);
assert.doesNotMatch(callback, /isPasswordResetPath\(safeNext\)/);
assert.match(recovery, /PASSWORD_RECOVERY_COOKIE/);
assert.match(recovery, /RECOVERY_AMR_METHOD/);
assert.match(actions, /currentSessionIsPasswordRecovery/);
assert.match(actions, /sanitizeAuthenticatedNext/);
assert.match(postLogin, /isAuthCompletionPath/);
assert.match(postLogin, /isPasswordResetPath\(incoming\)/);
assert.match(middleware, /isRecoveryTwoFaExemptPath/);
assert.doesNotMatch(complete, /flowType === "recovery"/);

// I. Change / reset password
assert.match(reset, /PASSWORD_RECOVERY/);
assert.match(reset, /completePasswordReset/);
mustNotContain(reset, /alert\(/, "reset page must not call alert()");
mustNotContain(reset, /error\.message/, "reset page must not leak raw errors");
assert.match(passwordRules, /PASSWORD_MIN_LENGTH = 8/);
assert.match(security, /changePassword/);
assert.match(security, /mapPasswordUpdateError/);

// J. Change email
assert.match(account, /updateUser\(/);
assert.match(account, /emailRedirectTo/);
assert.match(account, /mapEmailChangeError/);
assert.match(account.slice(account.indexOf("export async function requestEmailChange"), account.indexOf("export async function exportUserData")), /mapEmailChangeError/);
assert.doesNotMatch(
  account.slice(account.indexOf("export async function requestEmailChange"), account.indexOf("export async function exportUserData")),
  /error\.message/,
);

// K. Logout
assert.match(actions, /signOut\(\{ scope: "local" \}\)/);
assert.match(actions, /PASSWORD_RECOVERY_COOKIE/);

// L–O. Session / protected / guest
assert.match(middleware, /isProtected/);
assert.match(middleware, /isGuestOnlyAuthPath/);
assert.match(middleware, /PASSWORD_RECOVERY_COOKIE/);
assert.match(client, /getSupabasePublishableKey/);
mustNotContain(client, /SECRET_KEY|SERVICE_ROLE|ANON_KEY/, "browser client must stay publishable-key only");
mustNotContain(publicEnv, /SERVICE_ROLE|SECRET_KEY|ANON_KEY/, "public env must not expose secrets");

// P–Q. Duplicate signup / profile
assert.match(profile, /recover_profile_for_auth_user/);
assert.match(profile, /syncCanonicalProfileEmail/);
assert.match(actions, /isUnconfirmedDuplicateSignUp/);

// R–S. Identity linking / unlink protection
assert.match(actions, /unlinkAuthIdentity/);
assert.match(actions, /Keep at least one sign-in method/);
assert.match(securityForm, /Authentication methods/);
assert.match(settings, /Connected accounts/);
assert.match(complete, /PASSWORD_RECOVERY/);

// T. Safe redirects
assert.match(mustExist("lib/auth/safe-path.ts"), /isSafeInternalPath/);
assert.match(mustExist("lib/auth/callback-origin.ts"), /buildAuthCallbackUrl/);

console.log("verify-auth-lifecycle: ok");
