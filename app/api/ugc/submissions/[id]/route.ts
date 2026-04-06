import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';

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

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ submission: data });
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

  // 1. Get submission + vendor check
  const { data: sub } = await db
    .from('ugc_submissions')
    .select('*, campaign:ugc_campaigns!campaign_id(brand_id)')
    .eq('id', id)
    .single();

  if (!sub) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });

  // 2. Verify current user is the vendor or admin
  const { data: vendor } = await db
    .from('vendors')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const isAdmin = (await db.from('user_roles').select('id').eq('user_id', user.id).eq('role', 'admin').eq('is_active', true).maybeSingle()).data;

  // @ts-ignore
  if (!isAdmin && (!vendor || vendor.id !== sub.campaign?.brand_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Update status
  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({ 
      status, 
      rejection_reason: status === 'rejected' ? rejection_reason : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 4. Handle "Fixed Rate" Immediate Earnings Crediting
  const campaign = sub.campaign as unknown as { brand_id: string } | null;
  if (status === 'approved' && sub.status !== 'approved') {
    const { data: campData } = await db
      .from('ugc_campaigns')
      .select('payment_model, fixed_rate, spent_budget, approved_count')
      .eq('id', sub.campaign_id)
      .single();

    if (campData) {
       if (campData.payment_model === 'fixed_per_content' && campData.fixed_rate > 0) {
         const payout = campData.fixed_rate;
         
         // 1. Mark Submission Earnings
         await db.from('ugc_submissions').update({ total_earnings: payout }).eq('id', id);

         // 2. Mark Campaign Budget Consumption
         await db.from('ugc_campaigns').update({
           spent_budget: (campData.spent_budget ?? 0) + payout,
           approved_count: (campData.approved_count ?? 0) + 1
         }).eq('id', sub.campaign_id);

         // 3. Credit Influencer
         const { data: infData } = await db.from('influencers').select('id, user_id, total_earnings, available_balance').eq('id', sub.influencer_id).single();
         if (infData) {
            await db.from('influencers').update({
              total_earnings: (infData.total_earnings ?? 0) + payout,
              available_balance: (infData.available_balance ?? 0) + payout
            }).eq('id', infData.id);

            // 4. Credit Wallet
            const { data: wallet } = await db.from('wallets').select('available_balance, total_earned').eq('user_id', infData.user_id).single();
            if (wallet) {
              await db.from('wallets').update({
                available_balance: (wallet.available_balance ?? 0) + payout,
                total_earned: (wallet.total_earned ?? 0) + payout
              }).eq('user_id', infData.user_id);
            }

            // 5. Payout Record & Notification
            await db.from('payouts').insert({
              user_id: infData.user_id,
              type: 'ugc_earnings',
              amount: payout,
              currency: 'USD',
              status: 'paid',
              notes: `Fixed Asset Reward — submission ${id}`
            });

            await db.from('notifications').insert({
              user_id: infData.user_id,
              type: 'influencer',
              title: 'Fixed Reward Approved!',
              message: `You earned $${payout.toFixed(2)} from your approved submission.`,
              data: { submission_id: id, earnings: payout }
            });
         }
       } else {
         // Standard pay-per-view: just track approval count
         await db.from('ugc_campaigns').update({
           approved_count: (campData.approved_count ?? 0) + 1
         }).eq('id', sub.campaign_id);
       }
    }
  }

  return NextResponse.json({ submission: updated });
}
