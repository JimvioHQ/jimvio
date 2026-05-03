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
  const mine   = searchParams.get('mine') === 'true';

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

  if (mine) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: vendor } = await db.from('vendors').select('id').eq('user_id', user.id).single();
    if (vendor) {
      query = query.eq('brand_id', vendor.id);
    } else {
      return NextResponse.json({ data: [], total: 0, page, limit });
    }
  }

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
  let vendorId;

  const { data: vendor } = await db
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (vendor) {
    vendorId = vendor.id;
  } else {
    // Intercept and create a "personal" vendor profile to allow any user to create a campaign
    const { data: profile } = await db.from('profiles').select('full_name, email').eq('id', user.id).single();
    const fallbackName = profile?.full_name || profile?.email?.split('@')[0] || 'User';
    const slug = `${fallbackName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const { data: newVendor, error: vErr } = await db.from('vendors').insert({
      user_id: user.id,
      business_name: fallbackName,
      business_slug: slug,
    }).select('id').single();

    if (vErr) {
      return NextResponse.json({ error: 'Failed to initialize personal brand account' }, { status: 500 });
    }
    
    // Attempt to safely attach the vendor role if they don't have it
    await db.from('user_roles').insert({ user_id: user.id, role: 'vendor' }).select('id').maybeSingle();
    
    vendorId = newVendor.id;
  }

  const body: CreateCampaignPayload = await req.json();
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
  if (!rate_per_1k_views || rate_per_1k_views <= 0)
    return NextResponse.json({ error: 'rate_per_1k_views must be > 0' }, { status: 400 });
  if (!total_budget || total_budget <= 0)
    return NextResponse.json({ error: 'total_budget must be > 0' }, { status: 400 });

  const { data: campaign, error } = await db
    .from('ugc_campaigns')
    .insert({
      brand_id: vendorId,
      title: title.trim(),
      description,
      campaign_type,
      payment_model: payment_model ?? 'per_views',
      rate_per_1k_views,
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

  return NextResponse.json({ campaign }, { status: 201 });
}
