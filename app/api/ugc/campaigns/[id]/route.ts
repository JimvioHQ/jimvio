import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  assertCampaignReadyForFunding,
  campaignNeedsCompletenessGate,
  campaignWizardErrorPayload,
} from '@/lib/ugc/campaign-wizard-validation';
import {
  canReadCampaign,
  requireCampaignMember,
  requireCampaignPermission,
} from '@/lib/ugc/enterprise/brand-access';

// ─── GET /api/ugc/campaigns/[id] ────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });

  const db = createServiceRoleClient();

  const { data, error } = await db
    .from('ugc_campaigns')
    .select(`
      *,
      media:ugc_campaign_media(*),
      vendor:vendors!brand_id (
        business_name,
        business_logo,
        business_slug,
        business_description,
        business_country,
        business_type,
        created_at,
        rating,
        follower_count
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const readable = await canReadCampaign(db, user?.id ?? null, {
    status: data.status,
    brand_id: data.brand_id,
  });
  if (!readable) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

  return NextResponse.json({ campaign: data });
}

// ─── PATCH /api/ugc/campaigns/[id] ──────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await requireCampaignPermission(user.id, id, "campaigns.manage");
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const db = access.db;

  const { data: campaign } = await db
    .from('ugc_campaigns')
    .select('*')
    .eq('id', id)
    .single();

  const body = await req.json();
  const allowed = [
    'title', 'description', 'status', 'campaign_type', 'payment_model',
    'rate_per_1k_views', 'fixed_rate', 'total_budget',
    'max_payout_per_sub', 'allowed_platforms',
    'min_duration', 'max_duration', 'required_hashtags', 'required_mentions', 'required_keywords',
    'requires_face', 'starts_at', 'ends_at',
  ];
  const updates = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const currentStatus = typeof campaign?.status === 'string' ? campaign.status : 'draft';
  if (
    campaignNeedsCompletenessGate({
      currentStatus,
      nextStatus: updates.status,
      readyForFunding: body.readyForFunding,
    })
  ) {
    const { vendors: _vendors, ...currentRow } = (campaign ?? {}) as Record<string, unknown> & {
      vendors?: unknown;
    };
    void _vendors;
    const merged = { ...currentRow, ...updates };
    const ready = assertCampaignReadyForFunding(merged);
    if (!ready.success) {
      return NextResponse.json(campaignWizardErrorPayload(ready), { status: 400 });
    }
  }

  // Escrow Gate Logic: You cannot activate a campaign without deposited funds 
  if (updates.status === 'active') {
    const { data: escrow } = await db.from('ugc_campaign_escrow')
      .select('id')
      .eq('campaign_id', id)
      .eq('status', 'held')
      .maybeSingle();

    if (!escrow) {
      return NextResponse.json(
        { error: 'You must deposit the required campaign budget in escrow before activating.' },
        { status: 402 } 
      );
    }
  }

  const { data: updated, error } = await db
    .from('ugc_campaigns')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: updated });
}

// ─── DELETE /api/ugc/campaigns/[id] ─────────────────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const access = await requireCampaignMember(user.id, id);
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await access.db.from('ugc_campaigns').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
