import { after, NextRequest, NextResponse } from 'next/server';
import { verifySubmissionViews } from '@/lib/ugc/verification/verify-submission';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CreateSubmissionPayload } from '@/types/ugc';
import { isUgcSubmitPlatform, normalizePostUrl } from '@/lib/ugc/normalize-post-url';
import { listAccessibleBrandIds, requireCampaignPermission } from '@/lib/ugc/enterprise/brand-access';
import { filterBrandIdsByPermission } from '@/lib/ugc/enterprise/permissions';
import { emitUgcEvent } from '@/lib/ugc/enterprise/events';
import { creatorProfileRequiredPayload, requireInfluencer } from '@/lib/ugc/platform/auth';
import { parseClaimedViews } from '@/lib/ugc/submission-reward';
import { countryPolicyFromJoinConfig, creatorCountryDecision } from '@/lib/ugc/campaign-brief';
import { loadCreatorProfile } from '@/lib/ugc/join-service';

// ─── GET /api/ugc/submissions ────────────────────────────────────────────────
// Influencer sees own; vendor sees their campaign subs; admin sees all
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const { searchParams } = req.nextUrl;
  const page       = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit      = Math.min(50, Number(searchParams.get('limit') ?? 20));
  const offset     = (page - 1) * limit;
  const campaignId = searchParams.get('campaignId') ?? undefined;
  const status     = searchParams.get('status') ?? undefined;

  // Resolve roles
  const [{ data: influencer }, { data: adminRole }] = await Promise.all([
    db.from('influencers').select('id').eq('user_id', user.id).maybeSingle(),
    db.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').eq('is_active', true).maybeSingle(),
  ]);
  const brandIds = await listAccessibleBrandIds(db, user.id);
  const reviewBrandIds = await filterBrandIdsByPermission(db, user.id, brandIds, 'campaigns.review');

  let query = db
    .from('ugc_submissions')
    .select(
      `
      *,
      media:ugc_submission_media(*),
      campaign:ugc_campaigns!campaign_id (
        id, title, rate_per_1k_views, status, campaign_type, payment_model, fixed_rate, description,
        vendor:vendors!brand_id (business_name, business_logo, verification_status)
      ),
      influencer:influencers!influencer_id (id, display_name, profile_image)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  let countScope: "all" | { influencerId?: string; campaignIds?: string[] } = {};

  if (adminRole) {
    countScope = "all";
  } else if (campaignId) {
    const access = await requireCampaignPermission(user.id, campaignId, 'campaigns.review');
    if (access.ok) {
      query = query.eq('campaign_id', campaignId);
      countScope = { campaignIds: [campaignId] };
    } else if (influencer) {
      query = query.eq('influencer_id', influencer.id).eq('campaign_id', campaignId);
      countScope = { influencerId: influencer.id, campaignIds: [campaignId] };
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (reviewBrandIds.length > 0) {
    const { data: myCampaigns } = await db
      .from('ugc_campaigns')
      .select('id')
      .in('brand_id', reviewBrandIds);
    const ids = (myCampaigns ?? []).map((c: { id: string }) => c.id);
    if (ids.length === 0) {
      return NextResponse.json({
        data: [],
        total: 0,
        page,
        limit,
        counts: { pending: 0, revision_requested: 0, approved: 0, rejected: 0 },
      });
    }
    query = query.in('campaign_id', ids);
    countScope = { campaignIds: ids };
  } else if (influencer) {
    query = query.eq('influencer_id', influencer.id);
    countScope = { influencerId: influencer.id };
  } else {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (status) query = query.eq('status', status);
  if (campaignId && adminRole) query = query.eq('campaign_id', campaignId);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = await submissionStatusCounts(db, countScope);

  return NextResponse.json({ data, total: count ?? 0, page, limit, counts });
}

// ─── POST /api/ugc/submissions ───────────────────────────────────────────────
// Influencer submits a content URL to a campaign
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { db, influencer, ready, completion } = await requireInfluencer(user.id);
  if (!ready || !influencer) {
    return NextResponse.json(creatorProfileRequiredPayload(completion), { status: 403 });
  }

  const body: CreateSubmissionPayload & { claimed_views?: unknown } = await req.json();
  const { campaign_id, post_url, platform, caption } = body;
  const claimed = parseClaimedViews(body.claimed_views);
  if (!claimed.ok) return NextResponse.json({ error: claimed.error }, { status: 400 });

  if (!campaign_id) return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
  if (!post_url?.trim()) return NextResponse.json({ error: 'post_url required' }, { status: 400 });
  if (!isUgcSubmitPlatform(platform) || platform === 'x') {
    return NextResponse.json(
      { error: 'platform must be tiktok, instagram, youtube, or facebook' },
      { status: 400 }
    );
  }
  const canonicalUrl = normalizePostUrl(post_url);

  // Verify campaign exists and is active
  const { data: campaign } = await db
    .from('ugc_campaigns')
    .select('status, allowed_platforms, ends_at, brand_id, join_config')
    .eq('id', campaign_id)
    .single();

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  if (campaign.status !== 'active') {
    return NextResponse.json({ error: 'Campaign is not currently active' }, { status: 400 });
  }
  if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) {
    return NextResponse.json({ error: 'Campaign has ended' }, { status: 400 });
  }
  if (campaign.allowed_platforms && !campaign.allowed_platforms.includes(platform)) {
    return NextResponse.json(
      { error: `Platform ${platform} is not allowed for this campaign` },
      { status: 400 }
    );
  }

  const countryPolicy = countryPolicyFromJoinConfig(campaign.join_config);
  if (countryPolicy.mode === "restricted") {
    const creator = await loadCreatorProfile(db, user.id);
    const country = creatorCountryDecision(countryPolicy, creator.country);
    if (country === "unknown") {
      return NextResponse.json(
        {
          error: creator.vpnSuspected
            ? "Turn off VPN or proxy. Jimvio needs to confirm your real country before you submit to this campaign."
            : "Jimvio has not confirmed your real country yet. Keep using Jimvio normally for a few days, then try again.",
        },
        { status: 403 },
      );
    }
    if (country === "blocked") {
      return NextResponse.json(
        { error: "This campaign is not open in your country." },
        { status: 403 },
      );
    }
  }

  const { data: participation } = await db
    .from("ugc_campaign_participants")
    .select("status")
    .eq("campaign_id", campaign_id)
    .eq("influencer_id", influencer.id)
    .maybeSingle();

  if (!participation || participation.status !== "accepted") {
    return NextResponse.json(
      { error: "You must be an approved campaign participant before submitting content." },
      { status: 403 }
    );
  }

  const { data: submission, error } = await db
    .from('ugc_submissions')
    .insert({
      campaign_id,
      influencer_id: influencer.id,
      post_url: canonicalUrl,
      platform,
      caption,
      status: 'pending',
      claimed_views: claimed.views,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'You have already submitted this URL to this campaign' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await emitUgcEvent(db, campaign.brand_id, "submission.created", {
      campaignId: campaign_id,
      submissionId: submission.id,
      creatorUserId: user.id,
    });
  } catch {
    /* additive */
  }

  // Baseline read from the platform API; only views gained after this count.
  after(async () => {
    try {
      await verifySubmissionViews(submission.id);
    } catch (err) {
      console.error("[ugc] baseline view check failed", err instanceof Error ? err.message : err);
    }
  });

  return NextResponse.json({ submission }, { status: 201 });
}

const SUBMISSION_COUNT_STATUSES = ["pending", "revision_requested", "approved", "rejected"] as const;

async function submissionStatusCounts(
  db: ReturnType<typeof createServiceRoleClient>,
  scope: "all" | { influencerId?: string; campaignIds?: string[] },
) {
  const entries = await Promise.all(
    SUBMISSION_COUNT_STATUSES.map(async (status) => {
      let q = db.from("ugc_submissions").select("id", { count: "exact", head: true }).eq("status", status);
      if (scope !== "all") {
        if (scope.influencerId) q = q.eq("influencer_id", scope.influencerId);
        if (scope.campaignIds?.length) q = q.in("campaign_id", scope.campaignIds);
      }
      const { count } = await q;
      return [status, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<(typeof SUBMISSION_COUNT_STATUSES)[number], number>;
}
