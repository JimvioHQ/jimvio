import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CreateCampaignPayload } from '@/types/ugc';
import { recordUgcActivity } from '@/lib/ugc/platform/activity';
import { computeCampaignQuality } from '@/lib/ugc/enterprise/quality-engine';
import { emitUgcEvent } from '@/lib/ugc/enterprise/events';
import {
  brandIdFromRequest,
  listAccessibleBrandIds,
  requireBrandWorkspacePermission,
  userCanAccessBrand,
} from '@/lib/ugc/enterprise/brand-access';
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
  CAMPAIGN_PLATFORMS,
} from '@/lib/ugc/campaign-wizard-validation';
import { countryDisplayName, normalizeCountryCode } from '@/lib/geo/buyer-country';
import { sanitizeCampaignMedia, sanitizeStoredJoinConfig } from '@/lib/ugc/campaign-brief';
import { toPublicCampaignListItem } from '@/lib/ugc/public-campaign-list';
import { attachPublicFunding } from '@/lib/ugc/public-campaign-funding';

// ─── GET /api/ugc/campaigns ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit  = Math.min(50, Number(searchParams.get('limit') ?? 20));
  const offset = (page - 1) * limit;
  const type   = searchParams.get('type')   ?? undefined;
  const statusParam = searchParams.get('status');
  const mine   = searchParams.get('mine') === 'true' || searchParams.get('mine') === '1';
  const q      = (searchParams.get('q') ?? '').trim().slice(0, 80);
  const platform = searchParams.get('platform') ?? undefined;
  const sort   = searchParams.get('sort') ?? 'newest';
  const featured = searchParams.get('featured') === 'true' || searchParams.get('featured') === '1';

  const paymentModel = searchParams.get("payment_model") ?? searchParams.get("compensation") ?? undefined;
  const country = (searchParams.get("country") ?? "").trim().slice(0, 80);
  const ending = searchParams.get("ending") === "soon";

  const db = createServiceRoleClient();

  const sortCol =
    sort === "budget" ? "total_budget" :
    sort === "payout" ? "rate_per_1k_views" :
    sort === "deadline" ? "ends_at" :
    sort === "popular" || featured ? "submission_count" :
    "created_at";
  const sortAsc = sort === "deadline";

  let query = db
    .from("ugc_campaigns")
    .select(
      `
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_logo,
        business_slug,
        business_country,
        verification_status,
        verified_at,
        owner:profiles!user_id (
          avatar_url,
          full_name
        )
      )
    `,
      { count: "exact" }
    )
    .order(sortCol, { ascending: sortAsc, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (mine) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const brandIds = await listAccessibleBrandIds(db, user.id);
    if (brandIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }
    const requestedBrandId = brandIdFromRequest(req);
    if (requestedBrandId) {
      if (!(await userCanAccessBrand(db, requestedBrandId, user.id))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('brand_id', requestedBrandId);
    } else {
      query = query.in('brand_id', brandIds);
    }
    if (statusParam && statusParam !== 'all') query = query.eq('status', statusParam);
  } else {
    query = query.eq('status', 'active');
  }

  if (type) query = query.eq('campaign_type', type);
  if (paymentModel === "per_views" || paymentModel === "fixed_per_content") {
    query = query.eq("payment_model", paymentModel);
  }
  if (ending) {
    const nowIso = new Date().toISOString();
    const soonIso = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    query = query.gte("ends_at", nowIso).lte("ends_at", soonIso);
  }
  if (country) {
    const safeCountry = country.replace(/[%_,.()"'\\]/g, " ").replace(/\s+/g, " ").trim();
    if (safeCountry) {
      const terms = new Set<string>([safeCountry]);
      const iso = normalizeCountryCode(safeCountry);
      if (iso) {
        terms.add(iso);
        const display = countryDisplayName(iso);
        if (display && display.trim()) terms.add(display.trim());
      }
      const orFilter = [...terms]
        .map((term) => `business_country.ilike.%${term}%`)
        .join(",");
      const { data: countryVendors } = await db
        .from("vendors")
        .select("id")
        .or(orFilter)
        .limit(200);
      const ids = (countryVendors ?? []).map((v) => v.id);
      if (ids.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, limit });
      }
      query = query.in("brand_id", ids);
    }
  }
  if (platform && platform !== 'all') {
    if (!(CAMPAIGN_PLATFORMS as readonly string[]).includes(platform)) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }
    query = query.contains('allowed_platforms', [platform]);
  }
  if (q) {
    const safe = q.replace(/[%_,.()"'\\]/g, ' ').replace(/\s+/g, ' ').trim();
    if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
  }
  const minBudget = Number(searchParams.get('min_budget'));
  const maxBudget = Number(searchParams.get('max_budget'));
  if (Number.isFinite(minBudget) && minBudget > 0) query = query.gte('total_budget', minBudget);
  if (Number.isFinite(maxBudget) && maxBudget > 0) query = query.lte('total_budget', maxBudget);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Could not load campaigns." }, { status: 500 });

  const mapped = (data ?? []).map((row) =>
    mine ? row : toPublicCampaignListItem(row as Record<string, unknown>),
  );
  const rows = await attachPublicFunding(
    createServiceRoleClient(),
    mapped as Record<string, unknown>[],
  ).catch(() => mapped);
  // Public board: only campaigns whose full budget Jimvio holds. Owners still see their own.
  const visible = mine
    ? rows
    : rows.filter((r) => (r as { funding?: { state?: string } }).funding?.state === "funded");
  return NextResponse.json({
    data: visible,
    total: Math.max(0, (count ?? 0) - (rows.length - visible.length)),
    page,
    limit,
  });
}

// ─── POST /api/ugc/campaigns ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const body: CreateCampaignPayload & {
    readyForFunding?: boolean;
    brand_id?: string;
    join_config?: Record<string, unknown>;
    join_mode?: string;
    max_participants?: number | null;
    content_deadline?: string | null;
    live_at?: string | null;
    submission_deadline?: string | null;
    review_starts_at?: string | null;
    review_ends_at?: string | null;
    payment_at?: string | null;
  } = await req.json();
  const requestedBrandId =
    brandIdFromRequest(req) ||
    (typeof body.brand_id === "string" ? body.brand_id.trim() : null);

  let vendorId: string | undefined;
  const managed = await requireBrandWorkspacePermission(user.id, "campaigns.manage", requestedBrandId);
  if (managed.ok) {
    vendorId = managed.brandId;
  } else if (requestedBrandId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } else {
    const { data: vendor } = await db
      .from("vendors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (vendor) {
      vendorId = vendor.id;
    } else {
      const { data: profile } = await db.from("profiles").select("full_name, email").eq("id", user.id).single();
      const fallbackName = profile?.full_name || profile?.email?.split("@")[0] || "User";
      const slug = `${fallbackName.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;

      const { data: newVendor, error: vErr } = await db.from("vendors").insert({
        user_id: user.id,
        business_name: fallbackName,
        business_slug: slug,
      }).select("id").single();

      if (vErr) {
        return NextResponse.json({ error: "Failed to initialize personal brand account" }, { status: 500 });
      }

      await db.from("user_roles").insert({ user_id: user.id, role: "vendor" }).select("id").maybeSingle();
      vendorId = newVendor.id;
    }
  }

  if (!vendorId) {
    return NextResponse.json({ error: "Brand account required" }, { status: 403 });
  }

  const {
    title, description, campaign_type, rate_per_1k_views, total_budget,
    max_payout_per_sub, allowed_platforms, 
    min_duration, max_duration, required_hashtags, required_mentions, required_keywords,
    requires_face, starts_at, ends_at, media,
    content_deadline, live_at, submission_deadline,
    review_starts_at, review_ends_at, payment_at,
    // Custom Types logic
    music_track_url, music_artist_name, promotion_target, promotion_target_url,
    // Payment Models
    payment_model, fixed_rate, join_config, join_mode, max_participants
  } = body;

  if (!title?.trim())          return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!campaign_type)           return NextResponse.json({ error: 'campaign_type is required' }, { status: 400 });
  if (!total_budget || total_budget <= 0)
    return NextResponse.json({ error: 'total_budget must be > 0' }, { status: 400 });
  const model = payment_model ?? 'per_views';
  if (model === 'fixed_per_content') {
    if (!fixed_rate || fixed_rate <= 0) {
      return NextResponse.json({ error: 'fixed_rate must be > 0' }, { status: 400 });
    }
  } else if (!rate_per_1k_views || rate_per_1k_views <= 0) {
    return NextResponse.json({ error: 'rate_per_1k_views must be > 0' }, { status: 400 });
  }

  if (body.readyForFunding) {
    const ready = assertCampaignReadyForFunding(body as unknown as Record<string, unknown>);
    if (!ready.success) {
      return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
    }
  }

  const { data: campaign, error } = await db
    .from('ugc_campaigns')
    .insert({
      brand_id: vendorId,
      title: title.trim(),
      description,
      campaign_type,
      payment_model: payment_model ?? 'per_views',
      rate_per_1k_views: model === 'fixed_per_content' ? (rate_per_1k_views ?? 0) : rate_per_1k_views,
      fixed_rate: fixed_rate ?? 0,
      total_budget,
      max_payout_per_sub: max_payout_per_sub ?? 400,
      allowed_platforms: (allowed_platforms ?? ['tiktok', 'instagram', 'youtube', 'facebook']).filter(
        (platform: string) => platform !== 'x' && platform !== 'twitter',
      ),
      
      // New Structured Fields
      min_duration,
      max_duration,
      required_hashtags: required_hashtags ?? [],
      required_mentions: required_mentions ?? [],
      required_keywords: required_keywords ?? [],
      
      requires_face: requires_face ?? false,
      starts_at,
      ends_at,
      content_deadline: content_deadline ?? null,
      live_at: live_at ?? null,
      submission_deadline: submission_deadline ?? null,
      review_starts_at: review_starts_at ?? null,
      review_ends_at: review_ends_at ?? null,
      payment_at: payment_at ?? null,
      join_config: sanitizeStoredJoinConfig(join_config),
      join_mode:
        typeof join_mode === "string" &&
        (["instant", "application", "invite_only", "hybrid"] as string[]).includes(join_mode)
          ? join_mode
          : "instant",
      max_participants:
        Number.isFinite(Number(max_participants)) && Number(max_participants) > 0
          ? Math.floor(Number(max_participants))
          : null,
      
      // Custom Types Logics
      music_track_url: campaign_type === 'music_clipping' ? music_track_url : null,
      music_artist_name: campaign_type === 'music_clipping' ? music_artist_name : null,
      promotion_target: campaign_type === 'promotion' ? promotion_target : null,
      promotion_target_url: campaign_type === 'promotion' ? promotion_target_url : null,
      
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Could not create campaign." }, { status: 500 });

  // Handle Initial Media
  const cleanMedia = sanitizeCampaignMedia(media);
  if (cleanMedia.length > 0) {
    const mediaToInsert = cleanMedia.map((m, i) => ({
      campaign_id: campaign.id,
      type: m.type,
      url: m.url,
      thumbnail_url: m.thumbnail_url,
      usage: m.usage,
      order_index: i,
    }));
    const { error: mErr } = await db.from('ugc_campaign_media').insert(mediaToInsert);
    if (mErr) console.error('Failed to insert campaign media:', mErr);
  }

  await recordUgcActivity(db, {
    campaignId: campaign.id,
    eventType: 'campaign_created',
    title: 'Campaign created',
    description: campaign.title,
    actorUserId: user.id,
  });

  // Additive V2 hooks — never fail campaign creation
  try {
    await computeCampaignQuality(db, campaign.id);
    await emitUgcEvent(db, vendorId, "campaign.created", {
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      brand_id: vendorId,
    });
  } catch (hookErr) {
    console.error('UGC V2 campaign.created hooks failed:', hookErr);
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
