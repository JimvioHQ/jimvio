import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { confirmSignupHtml } from "../email/auth-templates/index.ts";
import { renderJimvioEmail } from "../email/shell.ts";
import {
  OTP_LIFETIME_MS,
  OTP_RESEND_COOLDOWN_MS,
  formatOtpCountdown,
  mapSignupOtpError,
  normalizeOtpToken,
  otpRemainingMs,
} from "./email-otp.ts";

const root = new URL("../../", import.meta.url);

describe("signup email OTP", () => {
  it("renders the provider token and a 10-minute notice without a sample code", () => {
    const html = confirmSignupHtml();
    assert.match(html, /\{\{ \.Token \}\}/);
    assert.match(html, /slice \.Token 0 1/);
    assert.match(html, /10 minutes/);
    assert.match(html, /Confirm your /);
    assert.equal(html.includes("482916"), false);
    assert.equal(html.includes("re_"), false);
    const text = renderJimvioEmail({
      preview: "code",
      icon: "mail-check",
      titleLead: "Confirm your ",
      titleAccent: "email",
      code: { label: "YOUR VERIFICATION CODE", supabaseOtp: true },
      help: "Help",
      helpUrl: "https://www.jimvio.com/contact",
      assetBaseUrl: "https://www.jimvio.com",
    }).text;
    assert.match(text, /\{\{ \.Token \}\}/);
    assert.equal(text.includes("482916"), false);
  });

  it("verifies signup codes with the provider token type and never logs the code", () => {
    const actions = readFileSync(new URL("lib/auth/actions.ts", root), "utf8");
    const verify = actions.slice(actions.indexOf("export async function verifySignUpOtp"));
    assert.match(verify, /type:\s*"signup"/);
    assert.match(verify, /verifyOtp\(/);
    assert.equal(verify.includes("console.log"), false);
    assert.match(verify, /token,/);
    assert.equal(/console\.(log|error|warn)\([^)]*token/.test(verify), false);
  });

  it("keeps the countdown tied to issuance and rejects bad codes", () => {
    const issued = 1_000_000;
    assert.equal(otpRemainingMs(issued, issued), OTP_LIFETIME_MS);
    assert.equal(otpRemainingMs(issued, issued + 30_000), OTP_LIFETIME_MS - 30_000);
    assert.equal(otpRemainingMs(issued, issued + OTP_LIFETIME_MS + 1), 0);
    assert.equal(formatOtpCountdown(OTP_LIFETIME_MS), "10:00");
    assert.equal(formatOtpCountdown(0), "0:00");
    assert.equal(OTP_RESEND_COOLDOWN_MS, 60_000);
    assert.equal(normalizeOtpToken("48 29-16"), "482916");
    assert.equal(normalizeOtpToken("abc"), "");
    assert.equal(mapSignupOtpError({ code: "otp_expired" }), "This code has expired. Request a new one.");
    assert.match(mapSignupOtpError({ status: 429 }), /Too many attempts/);
    assert.match(mapSignupOtpError({ message: "Token has expired or is invalid" }), /not valid|expired/);
    assert.match(mapSignupOtpError({ message: "Failed to fetch" }), /couldn't reach/);
  });
});
