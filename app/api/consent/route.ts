import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient, hasSupabaseSecretKey } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const ConsentSchema = z.object({
  regime: z.enum(["gdpr", "lgpd", "ccpa", "default"]),
  region: z.string().max(8).nullish(),
  policyVersion: z.string().max(32),
  analytics: z.boolean(),
  personalization: z.boolean(),
  marketing: z.boolean(),
  action: z.enum(["accept_all", "reject_all", "save", "withdraw", "do_not_sell"]),
});

/**
 * POST /api/consent — append-only legal consent audit record.
 *
 * Works for anonymous and signed-in visitors. Best-effort and non-blocking:
 * the client banner never depends on this succeeding, so a missing table or
 * misconfigured service role degrades gracefully.
 */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const limited = rateLimit(`consent:${ip}`, 30, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const parsed = ConsentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  if (!hasSupabaseSecretKey()) {
    // No audit sink configured — acknowledge without failing the client.
    return NextResponse.json({ ok: false, skipped: true });
  }

  // Attach the user id when a session exists (consent may also be anonymous).
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const payload = parsed.data;
  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.from("consent_records").insert({
      user_id: userId,
      regime: payload.regime,
      region: payload.region ?? null,
      policy_version: payload.policyVersion,
      analytics: payload.analytics,
      personalization: payload.personalization,
      marketing: payload.marketing,
      action: payload.action,
      user_agent: req.headers.get("user-agent")?.slice(0, 400) ?? null,
    } as never);

    if (error) {
      console.warn("[consent] audit insert failed:", error.message);
      return NextResponse.json({ ok: false, skipped: true });
    }
  } catch (err) {
    console.warn("[consent] audit insert threw:", err);
    return NextResponse.json({ ok: false, skipped: true });
  }

  return NextResponse.json({ ok: true });
}
