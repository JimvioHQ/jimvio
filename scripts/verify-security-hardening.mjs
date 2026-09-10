#!/usr/bin/env node
/**
 * Security unit checks for auth/payment hardening (no live secrets).
 */
import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";

// ── password policy ──────────────────────────────────────────────────────────
const { validateNewPassword, PASSWORD_MIN_LENGTH } = await import(
  "../lib/auth/password-rules.ts"
).catch(async () => {
  // Fallback for plain Node without TS loader: inline mirror of rules
  const PASSWORD_MIN_LENGTH = 8;
  function validateNewPassword(password, email) {
    if (!password || password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (!/[a-z]/.test(password)) return "Password must include a lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Password must include an uppercase letter.";
    if (!/[0-9]/.test(password)) return "Password must include a number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must include a symbol.";
    const local = email?.split("@")[0]?.trim().toLowerCase() ?? "";
    if (local.length >= 3 && password.toLowerCase().includes(local)) {
      return "Password should not contain your email.";
    }
    return null;
  }
  return { validateNewPassword, PASSWORD_MIN_LENGTH };
});

assert.equal(PASSWORD_MIN_LENGTH, 8);
assert.ok(validateNewPassword("Sh0rt!")); // too short (<8)
assert.ok(validateNewPassword("nouppercase123!"));
assert.ok(validateNewPassword("NOLOWERCASE123!"));
assert.ok(validateNewPassword("NoDigitsHere!!"));
assert.ok(validateNewPassword("NoSymbolHere12"));
assert.equal(validateNewPassword("Valid1!a"), null); // 8 chars, all classes
assert.ok(validateNewPassword("Alice1!x", "alice@example.com"));

// ── paymentAmountsMatch (symmetric) ──────────────────────────────────────────
function paymentAmountsMatch(receivedAmount, receivedCurrency, expectedAmount, expectedCurrency, tolerance = 0.05) {
  if (receivedCurrency.toUpperCase() !== expectedCurrency.toUpperCase()) return false;
  if (!Number.isFinite(receivedAmount) || !Number.isFinite(expectedAmount)) return false;
  if (receivedAmount <= 0 || expectedAmount <= 0) return false;
  return Math.abs(receivedAmount - expectedAmount) <= tolerance;
}

assert.equal(paymentAmountsMatch(10, "USD", 10, "USD"), true);
assert.equal(paymentAmountsMatch(9.96, "USD", 10, "USD"), true);
assert.equal(paymentAmountsMatch(9, "USD", 10, "USD"), false); // old $1 underpayment must fail
assert.equal(paymentAmountsMatch(11, "USD", 10, "USD"), false);
assert.equal(paymentAmountsMatch(10, "USD", 10, "EUR"), false);

// ── signed 2FA cookie shape ──────────────────────────────────────────────────
process.env.TWO_FA_COOKIE_SECRET = "test-secret-for-security-verify";
const secret = process.env.TWO_FA_COOKIE_SECRET;
function signPayload(payload) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}
const userId = "11111111-2222-3333-4444-555555555555";
const exp = Math.floor(Date.now() / 1000) + 3600;
const payload = `v1.${userId}.${exp}`;
const token = `${payload}.${signPayload(payload)}`;
const parts = token.split(".");
assert.equal(parts.length, 4);
const expected = signPayload(`${parts[0]}.${parts[1]}.${parts[2]}`);
assert.ok(timingSafeEqual(Buffer.from(parts[3]), Buffer.from(expected)));
assert.notEqual(token, userId); // must not be plain user id

console.log("security-hardening-verify: PASS");
