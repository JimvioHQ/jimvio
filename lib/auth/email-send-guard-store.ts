import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  authEmailSendBucket,
  SIGNUP_RESEND_COOLDOWN_SECONDS,
  SIGNUP_RESEND_EMAIL_WINDOW_LIMIT,
  SIGNUP_RESEND_EMAIL_WINDOW_SECONDS,
  SIGNUP_RESEND_IP_WINDOW_LIMIT,
  SIGNUP_RESEND_IP_WINDOW_SECONDS,
} from "@/lib/auth/email-send-guard";

async function consume(bucket: string, limit: number, windowSeconds: number): Promise<boolean | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("consume_auth_email_send", {
    p_bucket: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || typeof data !== "boolean") return null;
  return data;
}

/**
 * Shared Postgres window. A guard outage falls through to Supabase Auth's own
 * send frequency and hourly email cap instead of blocking every resend.
 */
export async function allowAuthEmailSend(email: string, ip: string | null): Promise<boolean> {
  const checks: Array<[string, number, number]> = [
    [authEmailSendBucket("email", `cooldown:${email}`), 1, SIGNUP_RESEND_COOLDOWN_SECONDS],
    [
      authEmailSendBucket("email", `window:${email}`),
      SIGNUP_RESEND_EMAIL_WINDOW_LIMIT,
      SIGNUP_RESEND_EMAIL_WINDOW_SECONDS,
    ],
  ];
  if (ip) {
    checks.push([authEmailSendBucket("ip", ip), SIGNUP_RESEND_IP_WINDOW_LIMIT, SIGNUP_RESEND_IP_WINDOW_SECONDS]);
  }

  try {
    for (const [bucket, limit, seconds] of checks) {
      const allowed = await consume(bucket, limit, seconds);
      if (allowed === null) {
        console.error("[auth] email send guard unavailable");
        return true;
      }
      if (!allowed) return false;
    }
    return true;
  } catch {
    console.error("[auth] email send guard unavailable");
    return true;
  }
}
