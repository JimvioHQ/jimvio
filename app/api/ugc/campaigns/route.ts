import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CreateCampaignPayload } from '@/types/ugc';

// ─── GET /api/ugc/campaigns ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page   = Math.max(1, Number(searchParams.get('page')  ?? 1));
  const limit  = Math.min(50, Number(searchParams.get('limit') ?? 20));
  const offset = (page - 1) * limit;
  const type   = searchParams.get('type')   ?? undefined;
  const status = searchParams.get('status') ?? 'active';

  const db = createServiceRoleClient();

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
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status !== 'all') query = query.eq('status', status);
  if (type)             query = query.eq('campaign_type', type);

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
  const { data: vendor } = await db
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!vendor) {
    return NextResponse.json({ error: 'Only vendors can create campaigns' }, { status: 403 });
  }

  const body: CreateCampaignPayload = await req.json();
  const {
    title, description, campaign_type, rate_per_1k_views, total_budget,
    max_payout_per_sub, allowed_platforms, 
    min_duration, max_duration, required_hashtags, required_mentions, required_keywords,
    requires_face, starts_at, ends_at,
  } = body;

  if (!title?.trim())          return NextResponse.json({ error: 'title is required' }, { status: 400 });
  if (!campaign_type)           return NextResponse.json({ error: 'campaign_type is required' }, { status: 400 });
  if (!rate_per_1k_views || rate_per_1k_views <= 0)
    return NextResponse.json({ error: 'rate_per_1k_views must be > 0' }, { status: 400 });
  if (!total_budget || total_budget <= 0)
    return NextResponse.json({ error: 'total_budget must be > 0' }, { status: 400 });

  const { data: campaign, error } = await db
    .from('ugc_campaigns')
    .insert({
      brand_id: vendor.id,
      title: title.trim(),
      description,
      campaign_type,
      rate_per_1k_views,
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
      status: 'draft',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign }, { status: 201 });
}
