import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";
import { campaignFunding, type EscrowRow } from "@/lib/ugc/escrow-funding";
import { youtubeNumbers } from "@/lib/ugc/checker/check-link";
import { videoRefFromUrl } from "@/lib/ugc/verification/video-ref";
import {
  summarizeCampaignPerformance,
  verdictFor,
  type PerformanceSubmission,
} from "@/lib/ugc/verification/campaign-performance";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Campaign owner's checker: real vs held views, per post and in total, plus escrow. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "campaigns.review");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const [{ data: campaign }, { data: subs }, { data: escrow }] = await Promise.all([
    db
      .from("ugc_campaigns")
      .select("id, title, payment_model, rate_per_1k_views, fixed_rate, max_payout_per_sub, total_budget, spent_budget, approved_count, review_mode")
      .eq("id", id)
      .maybeSingle(),
    db
      .from("ugc_submissions")
      .select(
        "id, status, platform, post_url, created_at, accepted_views, total_earnings, rejection_reason, platform_video_id, verification_status, verification_flags, verification_note, verification_checked_at, baseline_views, latest_views, verified_views, fraud_score, content_check, influencer:influencers!influencer_id (display_name, profile_image, user_id)",
      )
      .eq("campaign_id", id)
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("ugc_campaign_escrow").select("status, amount, currency, refunded_amount").eq("campaign_id", id),
  ]);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const funding = campaignFunding({
    escrow: (escrow ?? []) as EscrowRow[],
    totalBudget: campaign.total_budget,
    spentBudget: campaign.spent_budget,
  });
  const rows = (subs ?? []) as unknown as (PerformanceSubmission & Record<string, unknown>)[];
  // Public YouTube numbers for posts Jimvio could not verify yet (shown, never paid).
  const unread = rows
    .filter((r) => r.platform === "youtube" && r.verification_status !== "verified" && r.latest_views == null)
    .slice(0, 10);
  await Promise.all(
    unread.map(async (r) => {
      const ref = videoRefFromUrl("youtube", String(r.post_url ?? ""));
      if (!ref) return;
      const yt = await youtubeNumbers(ref.videoId, user.id).catch(() => null);
      if (yt?.numbers.views != null) {
        r.latest_views = yt.numbers.views;
        r.platform_video_id = ref.videoId;
      }
    }),
  );
  const userIds = [
    ...new Set(
      rows
        .map((r) => {
          const inf = Array.isArray(r.influencer) ? r.influencer[0] : r.influencer;
          return (inf as { user_id?: string } | null)?.user_id ?? null;
        })
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const usernames = new Map<string, string>();
  if (userIds.length) {
    const { data: people } = await db.from("profiles").select("id, username").in("id", userIds);
    for (const p of people ?? []) if (p.username) usernames.set(p.id, p.username);
  }
  const performance = summarizeCampaignPerformance(rows, {
    paymentModel: campaign.payment_model,
    ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
    heldUsd: funding.heldUsd,
  });

  const rate = Number(campaign.rate_per_1k_views ?? 0);
  const fixed = Number(campaign.fixed_rate ?? 0);
  const cap = campaign.max_payout_per_sub == null ? null : Number(campaign.max_payout_per_sub);
  const capped = (usd: number) => Math.round((cap != null && cap > 0 ? Math.min(usd, cap) : usd) * 100) / 100;
  const rewardFor = (views: number | null) =>
    campaign.payment_model === "per_views" ? (views == null ? null : capped((views / 1000) * rate)) : capped(fixed);

  return NextResponse.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      paymentModel: campaign.payment_model,
      ratePer1k: Number(campaign.rate_per_1k_views ?? 0),
      fixedRate: Number(campaign.fixed_rate ?? 0),
      reviewMode: (campaign as { review_mode?: string }).review_mode ?? "manual",
      maxPayoutPerSub: cap,
    },
    funding,
    performance,
    submissions: rows.map((r) => {
      const inf = Array.isArray(r.influencer) ? r.influencer[0] : r.influencer;
      return {
        id: r.id,
        status: r.status,
        platform: r.platform,
        postUrl: r.post_url,
        createdAt: r.created_at,
        creator: (inf as { display_name?: string } | null)?.display_name ?? "Creator",
        username: usernames.get((inf as { user_id?: string } | null)?.user_id ?? "") ?? null,
        verdict: verdictFor(r),
        baselineViews: r.baseline_views ?? null,
        latestViews: r.latest_views ?? null,
        gainedViews:
          r.latest_views != null && r.baseline_views != null ? Math.max(0, Number(r.latest_views) - Number(r.baseline_views)) : null,
        acceptedViews: r.accepted_views ?? null,
        flags: r.verification_flags ?? [],
        fraudScore: r.fraud_score ?? null,
        note: r.verification_note ?? null,
        checkedAt: r.verification_checked_at ?? null,
        earnings: r.total_earnings ?? null,
        rejectionReason: (r.rejection_reason as string | null) ?? null,
        avatar: (inf as { profile_image?: string | null } | null)?.profile_image ?? null,
        thumbnail:
          r.platform === "youtube" && r.platform_video_id ? `https://i.ytimg.com/vi/${r.platform_video_id}/mqdefault.jpg` : null,
        // Reward if approved now: verified growth for per-view campaigns, the fixed rate otherwise.
        estimatedReward:
          r.verification_status === "verified"
            ? rewardFor(r.latest_views != null && r.baseline_views != null ? Math.max(0, Number(r.latest_views) - Number(r.baseline_views)) : 0)
            : campaign.payment_model === "per_views"
              ? null
              : rewardFor(null),
        // Public views read even when ownership could not be proven (not payable).
        publicViews: r.verification_status !== "verified" ? (r.latest_views ?? null) : null,
        content: (r.content_check as Record<string, unknown> | null) ?? null,
      };
    }),
  });
}
