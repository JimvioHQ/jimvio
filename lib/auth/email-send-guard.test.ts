import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  SIGNUP_RESEND_COOLDOWN_SECONDS,
  SIGNUP_RESEND_EMAIL_WINDOW_LIMIT,
  SIGNUP_RESEND_EMAIL_WINDOW_SECONDS,
  SIGNUP_RESEND_IP_WINDOW_LIMIT,
  authEmailSendBucket,
  nextSendWindow,
} from "./email-send-guard.ts";

describe("signup resend guard", () => {
  it("enforces the cooldown, the address window, and a hashed bucket", () => {
    assert.equal(SIGNUP_RESEND_COOLDOWN_SECONDS, 60);
    assert.equal(SIGNUP_RESEND_EMAIL_WINDOW_LIMIT, 5);
    assert.equal(SIGNUP_RESEND_EMAIL_WINDOW_SECONDS, 600);
    assert.equal(SIGNUP_RESEND_IP_WINDOW_LIMIT, 8);
    const now = 1_000_000;
    let state = nextSendWindow(null, now, 1, 60_000);
    assert.equal(state.allowed, true);
    state = nextSendWindow(state.state, now + 1_000, 1, 60_000);
    assert.equal(state.allowed, false);
    state = nextSendWindow(state.state, now + 60_000, 1, 60_000);
    assert.equal(state.allowed, true);

    let window = nextSendWindow(null, now, 5, 600_000);
    for (let i = 0; i < 4; i += 1) window = nextSendWindow(window.state, now + 1, 5, 600_000);
    assert.equal(window.allowed, true);
    window = nextSendWindow(window.state, now + 1, 5, 600_000);
    assert.equal(window.allowed, false);

    const bucket = authEmailSendBucket("email", "person@example.com");
    assert.equal(bucket.length, 64);
    assert.equal(bucket.includes("person@example.com"), false);
  });

  it("stores the guard in Postgres and keeps it off the public API", () => {
    const sql = readFileSync(
      new URL("../../supabase/migrations/20261012164030_auth_email_send_guard.sql", import.meta.url),
      "utf8",
    );
    assert.match(sql, /consume_auth_email_send/);
    assert.match(sql, /on conflict \(bucket\) do update/);
    assert.match(sql, /security invoker/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /revoke all on function public\.consume_auth_email_send/);
    assert.match(sql, /grant execute on function public\.consume_auth_email_send[\s\S]*to service_role/);
    const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
    const resend = actions.slice(
      actions.indexOf("export async function resendSignUpConfirmation"),
      actions.indexOf("export async function verifySignUpOtp"),
    );
    assert.match(resend, /allowAuthEmailSend/);
    assert.equal(resend.indexOf("allowAuthEmailSend") < resend.indexOf("auth.resend"), true);
  });
});
