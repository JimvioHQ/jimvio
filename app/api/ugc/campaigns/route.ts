import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CreateCampaignPayload } from '@/types/ugc';
import { recordUgcActivity } from '@/lib/ugc/platform/activity';
import { computeCampaignQuality } from '@/lib/ugc/enterprise/quality-engine';
import { emitUgcEvent } from '@/lib/ugc/enterprise/events';
import {
  listAccessibleBrandIds,
  requireBrandWorkspacePermission,
} from '@/lib/ugc/enterprise/brand-access';
import {
  assertCampaignReadyForFunding,
  campaignWizardErrorPayload,
  CAMPAIGN_PLATFORMS,
} from '@/lib/ugc/campaign-wizard-validation';

// ─── GET /api/ugc/campaigns ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit  = Math.min(50, Number(searchParams.get('limit') ?? 20));
  const offset = (page - 1) * limit;
  const type   = searchParams.get('type')   ?? undefined;
  const statusParam = searchParams.get('status');
  const mine   = searchParams.get('mine') === 'true';
  const q      = (searchParams.get('q') ?? '').trim().slice(0, 80);
  const platform = searchParams.get('platform') ?? undefined;
  const sort   = searchParams.get('sort') ?? 'newest';
  const featured = searchParams.get('featured') === 'true' || searchParams.get('featured') === '1';

  const db = createServiceRoleClient();

  const sortCol =
    sort === 'budget' ? 'total_budget' :
    sort === 'payout' ? 'rate_per_1k_views' :
    sort === 'popular' || featured ? 'submission_count' :
    'created_at';

  let query = db
    .from('ugc_campaigns')
    .select(
      `
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_logo,
        business_slug
      )
    `,
      { count: 'exact' }
    )
    .order(sortCol, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (mine) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const brandIds = await listAccessibleBrandIds(db, user.id);
    if (brandIds.length === 0) {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }
    query = query.in('brand_id', brandIds);
    if (statusParam && statusParam !== 'all') query = query.eq('status', statusParam);
  } else {
    query = query.eq('status', 'active');
  }

  if (type) query = query.eq('campaign_type', type);
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, limit });
}

// ─── POST /api/ugc/campaigns ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const body: CreateCampaignPayload & { readyForFunding?: boolean; brand_id?: string } = await req.json();
  const requestedBrandId = typeof body.brand_id === "string" ? body.brand_id.trim() : null;

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
    // Custom Types logic
    music_track_url, music_artist_name, promotion_target, promotion_target_url,
    // Payment Models
    payment_model, fixed_rate
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
      allowed_platforms: allowed_platforms ?? ['tiktok', 'instagram', 'youtube', 'x'],
      
      // New Structured Fields
      min_duration,
      max_duration,
      required_hashtags: required_hashtags ?? [],
      required_mentions: required_mentions ?? [],
      required_keywords: required_keywords ?? [],
      
      requires_face: requires_face ?? false,
      starts_at,
      ends_at,
      
      // Custom Types Logics
      music_track_url: campaign_type === 'music_clipping' ? music_track_url : null,
      music_artist_name: campaign_type === 'music_clipping' ? music_artist_name : null,
      promotion_target: campaign_type === 'promotion' ? promotion_target : null,
      promotion_target_url: campaign_type === 'promotion' ? promotion_target_url : null,
      
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Handle Initial Media
  if (media && media.length > 0) {
    const mediaToInsert = media.map((m: any, i: number) => ({
      campaign_id: campaign.id,
      type: m.type || 'image',
      url: m.url,
      thumbnail_url: m.thumbnail_url || null,
      usage: m.usage || 'example',
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
