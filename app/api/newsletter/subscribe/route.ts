import { NextRequest, NextResponse } from "next/server";
import { getAppBaseUrl, isEmailEnabled } from "@/lib/email/config";
import { sendEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/ops/rate-limit";
import { createSupabaseNewsletterStore } from "@/lib/newsletter/store";
import { newsletterTokenSecret, subscribeToNewsletter } from "@/lib/newsletter/subscription";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || "unknown").slice(0, 80);
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const address = clientAddress(request);
  const byIp = rateLimit(`newsletter:ip:${address}`, 5, 60 * 60_000);
  const byEmail = rateLimit(`newsletter:email:${email.trim().toLowerCase().slice(0, 200)}`, 3, 60 * 60_000);

  if (!hasSupabaseSecretKey()) {
    return NextResponse.json({ status: "not_configured" }, { status: 503 });
  }

  const outcome = await subscribeToNewsletter({
    email,
    store: createSupabaseNewsletterStore(createServiceRoleClient()),
    send: async (message) => {
      if (!isEmailEnabled()) return { ok: false, skipped: true };
      const result = await sendEmail(message);
      return result.ok ? { ok: true } : { ok: false, skipped: result.skipped };
    },
    secret: newsletterTokenSecret(),
    rateAllowed: byIp.allowed && byEmail.allowed,
    nowSec: Math.floor(Date.now() / 1000),
    appBaseUrl: getAppBaseUrl(),
  });

  const http = outcome.status === "confirmation_sent" || outcome.status === "already_subscribed"
    ? 200
    : outcome.status === "invalid_email"
      ? 400
      : outcome.status === "rate_limited"
        ? 429
        : outcome.status === "database_error"
          ? 500
          : 503;
  return NextResponse.json(outcome, { status: http });
}
