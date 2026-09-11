#!/usr/bin/env node
/**
 * Static check: captcha / Turnstile auth failures must not map to
 * "Invalid email or password."
 */
import assert from "node:assert/strict";
import {
  isCaptchaAuthError,
  mapSignInAuthError,
} from "../../lib/auth/sign-in-errors.ts";

assert.equal(
  mapSignInAuthError({
    code: "captcha_failed",
    message: "Captcha verification process failed",
    status: 400,
  }),
  "Security check failed. Refresh the page and try again."
);

assert.equal(
  mapSignInAuthError({
    code: "invalid_credentials",
    message: "Invalid login credentials",
    status: 400,
  }),
  "Invalid email or password."
);

assert.equal(
  isCaptchaAuthError({
    code: "captcha_failed",
    message: "Captcha verification process failed",
  }),
  true
);

assert.equal(
  isCaptchaAuthError({
    code: "invalid_credentials",
    message: "Invalid login credentials",
  }),
  false
);

console.log("✅ captcha auth error mapping verified");
