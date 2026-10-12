import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const root = new URL("../../", import.meta.url);

describe("password recovery OTP", () => {
  it("verifies the recovery code with the recovery token type and never logs it", () => {
    const actions = readFileSync(new URL("lib/auth/actions.ts", root), "utf8");
    const verify = actions.slice(
      actions.indexOf("export async function verifyRecoveryOtp"),
      actions.indexOf("export async function beginPasswordRecovery"),
    );
    assert.match(verify, /type:\s*"recovery"/);
    assert.match(verify, /verifyOtp\(/);
    assert.match(verify, /accessTokenHasRecoveryAmr/);
    assert.match(verify, /PASSWORD_RECOVERY_COOKIE/);
    assert.equal(verify.includes("console.log"), false);
    assert.equal(/console\.(log|error|warn)\([^)]*token/.test(verify), false);
    assert.match(actions, /GENERIC_RESET_SENT/);
    assert.match(actions, /updateUser\(\{ password \}\)/);
    assert.match(actions, /Passwords do not match/);
  });

  it("shows a recovery code entry after the reset request and keeps the email link secondary", () => {
    const form = readFileSync(new URL("app/(auth)/forgot-password/forgot-password-form.tsx", root), "utf8");
    const entry = readFileSync(new URL("components/auth/recovery-otp-entry.tsx", root), "utf8");
    assert.match(form, /RecoveryOtpEntry/);
    assert.match(form, /resetPassword/);
    assert.equal(form.includes("Check your email"), false);
    assert.match(entry, /verifyRecoveryOtp/);
    assert.match(entry, /router\.push\("\/reset-password"\)/);
    assert.match(entry, /Reset Password button/);
    assert.match(entry, /OTP_RESEND_COOLDOWN_MS/);
    const callback = readFileSync(new URL("app/auth/callback/route.ts", root), "utf8");
    assert.match(callback, /verifyOtp\(\{ type: "recovery", token_hash: tokenHash \}\)/);
    const actions = readFileSync(new URL("lib/auth/actions.ts", root), "utf8");
    const reset = actions.slice(actions.indexOf("export async function completePasswordReset"));
    assert.match(reset, /password !== confirm/);
    assert.match(reset, /currentSessionIsPasswordRecovery/);
    assert.match(reset, /updateUser\(\{ password \}\)/);
  });
});

describe("auth marketing panel", () => {
  it("keeps the desktop panel and omits the mobile marketing strip", () => {
    const layout = readFileSync(new URL("app/(auth)/layout.tsx", root), "utf8");
    assert.match(layout, /hidden flex-1 overflow-hidden bg-zinc-950 lg:block/);
    assert.match(layout, /108,211/);
    assert.match(layout, /23,429/);
    assert.match(layout, /1,134,150/);
    assert.equal(layout.includes("lg:hidden"), false);
    const mobileBlock = layout.slice(layout.indexOf("{children}"), layout.indexOf("<aside"));
    assert.equal(mobileBlock.includes("Create. Sell. Promote. Earn. Grow."), false);
    assert.equal(mobileBlock.includes("108,211"), false);
  });
});
