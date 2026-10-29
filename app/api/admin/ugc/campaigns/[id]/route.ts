import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { isUuid, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { writeAuditEvent } from "@/services/ops/audit";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";
import { summarizeCampaignPerformance, verdictFor, type PerformanceSubmission } from "@/lib/ugc/verification/campaign-performance";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (t: string) => any };

/** Everything an admin needs to review one campaign. */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  const db = createServiceRoleClient() as unknown as Db;

  const { data: campaign } = await db
    .from("ugc_campaigns")
    .select("*, media:ugc_campaign_media(*), vendor:vendors!brand_id (id, business_name, business_logo, business_slug, business_country, verification_status, user_id)")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });

  const [escrowRes, subsRes, partsRes, activityRes, payoutsRes, ownerRes] = await Promise.all([
    db.from("ugc_campaign_escrow").select("*").eq("campaign_id", id),
    db
      .from("ugc_submissions")
      .select(
        "id, status, platform, post_url, created_at, claimed_views, accepted_views, total_earnings, verification_status, verification_flags, verification_note, baseline_views, latest_views, verified_views, fraud_score, content_check, influencer:influencers!influencer_id (display_name, user_id)",
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("ugc_campaign_participants")
      .select("id, status, joined_at, application_message, influencer:influencers!influencer_id (display_name, user_id)")
      .eq("campaign_id", id)
      .order("joined_at", { ascending: false, nullsFirst: false })
      .limit(200),
    db
      .from("ugc_campaign_activity")
      .select("id, event_type, title, description, created_at")
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    Promise.resolve({ data: [] as unknown[] }),
    campaign.vendor?.user_id
      ? db.from("profiles").select("id, full_name, username, email, country").eq("id", campaign.vendor.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const subIds = ((subsRes.data ?? []) as { id: string }[]).map((s) => s.id);
  const payouts = subIds.length
    ? (
        await db
          .from("ugc_payouts")
          .select("id, amount, status, created_at, paid_at, submission_id")
          .in("submission_id", subIds)
          .order("created_at", { ascending: false })
      ).data ?? []
    : [];
  void payoutsRes;
  const escrow = (escrowRes.data ?? []) as (EscrowRow & Record<string, unknown>)[];
  const funding = campaignFunding({ escrow, totalBudget: campaign.total_budget, spentBudget: campaign.spent_budget });
  const subs = (subsRes.data ?? []) as (PerformanceSubmission & Record<string, unknown>)[];
  const performance = summarizeCampaignPerformance(subs, {
    paymentModel: campaign.payment_model,
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    heldUsd: funding.heldUsd,
  });

  return NextResponse.json({
    campaign,
    owner: ownerRes.data ?? null,
    escrow,
    funding,
    performance,
    submissions: subs.map((s) => ({ ...s, verdict: verdictFor(s) })),
    participants: partsRes.data ?? [],
    activity: activityRes.data ?? [],
    payouts,
  });
}

/**
 * Deletes a campaign for good. Refused while it has payouts, so payment
 * records are never lost — cancel those campaigns instead.
 */
export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requirePlatformAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Invalid campaign." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { confirmTitle?: string };
  const db = createServiceRoleClient() as unknown as Db;

  const { data: campaign } = await db.from("ugc_campaigns").select("id, title, status, total_budget, brand_id").eq("id", id).maybeSingle();
  if (!campaign) return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  if ((body.confirmTitle ?? "").trim() !== String(campaign.title).trim()) {
    return NextResponse.json({ error: "Type the campaign title exactly to confirm." }, { status: 400 });
  }

  const { data: subs } = await db.from("ugc_submissions").select("id").eq("campaign_id", id);
  const subIds = ((subs ?? []) as { id: string }[]).map((s) => s.id);
  if (subIds.length) {
    const { count } = await db.from("ugc_payouts").select("id", { count: "exact", head: true }).in("submission_id", subIds);
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "This campaign has creator payouts. Cancel it instead so payment records are kept." },
        { status: 409 },
      );
    }
  }
  const { data: escrow } = await db.from("ugc_campaign_escrow").select("status, amount, currency, refunded_amount").eq("campaign_id", id);

  if (subIds.length) await db.from("ugc_reports").delete().in("submission_id", subIds);
  const { error } = await db.from("ugc_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: `Could not delete: ${error.message}` }, { status: 500 });

  const h = await headers();
  await writeAuditEvent({
    actorId: auth.user.id,
    action: "ugc.campaign.delete",
    entityType: "ugc_campaigns",
    entityId: id,
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: h.get("user-agent"),
    metadata: { title: campaign.title, status: campaign.status, brand_id: campaign.brand_id, submissions: subIds.length, escrow },
  });
  return NextResponse.json({ ok: true });
}
