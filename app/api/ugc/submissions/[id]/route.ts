import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';
import { creditFixedPayoutIfNeeded } from '@/lib/ugc/credit-fixed-payout';
import { requireCampaignPermission } from '@/lib/ugc/enterprise/brand-access';
import { assertCanReadSubmission } from '@/lib/ugc/submission-access';
import { campaignFunding, type EscrowRow } from '@/lib/ugc/escrow-funding';


export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const { data, error } = await db
    .from('ugc_submissions')
    .select(`
      *,
      media:ugc_submission_media(*),
      campaign:ugc_campaigns!campaign_id (*),
      influencer:influencers!influencer_id (id, display_name, profile_image, user_id),
      snapshots:ugc_view_snapshots(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: error?.message ?? 'Not found' }, { status: 404 });

  const allowed = await assertCanReadSubmission(db, user.id, data);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rawInf = Array.isArray(data.influencer) ? data.influencer[0] : data.influencer;
  const publicInfluencer = rawInf
    ? Object.fromEntries(
        Object.entries(rawInf as Record<string, unknown>).filter(([key]) => key !== "user_id"),
      )
    : data.influencer;
  const campaignRow = (Array.isArray(data.campaign) ? data.campaign[0] : data.campaign) as
    | { total_budget?: number | null; spent_budget?: number | null }
    | null;
  const { data: escrowRows } = await db
    .from('ugc_campaign_escrow')
    .select('status, amount, currency, refunded_amount')
    .eq('campaign_id', data.campaign_id);
  const funding = campaignFunding({
    escrow: (escrowRows ?? []) as EscrowRow[],
    totalBudget: campaignRow?.total_budget,
    spentBudget: campaignRow?.spent_budget,
  });
  return NextResponse.json({
    submission: { ...data, influencer: publicInfluencer, funding },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  const body = await req.json();
  const { status, rejection_reason } = body;

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data: sub } = await db
    .from('ugc_submissions')
    .select('*, campaign:ugc_campaigns!campaign_id(brand_id)')
    .eq('id', id)
    .single();

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  const campaignJoinRaw = sub.campaign as { brand_id?: string } | { brand_id?: string }[] | null;
  const campaignJoin = Array.isArray(campaignJoinRaw) ? campaignJoinRaw[0] : campaignJoinRaw;
  if (!campaignJoin?.brand_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const access = await requireCampaignPermission(user.id, sub.campaign_id, 'campaigns.review');
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  if (sub.status === 'approved' && status !== 'approved') {
    return NextResponse.json({ error: 'Approved submissions cannot be changed' }, { status: 409 });
  }

  if (status === 'approved') {
    const { data: payCampaign } = await db
      .from('ugc_campaigns')
      .select('payment_model')
      .eq('id', sub.campaign_id)
      .maybeSingle();
    if (payCampaign?.payment_model === 'per_views') {
      return NextResponse.json(
        { error: 'Per-view campaigns must be approved with accepted views.' },
        { status: 400 },
      );
    }
    const { data: updated, error } = await db
      .from('ugc_submissions')
      .update({
        status: 'approved',
        rejection_reason: null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .in('status', ['pending', 'revision_requested'])
      .select()
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!updated) return NextResponse.json({ error: 'Already approved' }, { status: 409 });

    const credit = await creditFixedPayoutIfNeeded(db, {
      submissionId: id,
      campaignId: sub.campaign_id,
      influencerId: sub.influencer_id,
    });
    if (!credit.ok) {
      await db
        .from('ugc_submissions')
        .update({ status: sub.status, reviewed_by: null, reviewed_at: null })
        .eq('id', id)
        .eq('status', 'approved');
      return NextResponse.json({ error: credit.error }, { status: credit.status });
    }
    return NextResponse.json({ submission: updated, payout: credit });
  }

  if (status === 'rejected' && sub.status === 'approved') {
    return NextResponse.json({ error: 'Approved submissions cannot be rejected' }, { status: 409 });
  }

  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({
      status,
      rejection_reason: status === 'rejected' ? rejection_reason : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .in('status', status === 'rejected' ? ['pending', 'revision_requested'] : ['pending', 'revision_requested', 'rejected'])
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) {
    return NextResponse.json({ error: 'Submission cannot be updated from this status' }, { status: 409 });
  }
  return NextResponse.json({ submission: updated });
}
