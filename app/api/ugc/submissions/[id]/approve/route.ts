import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

// PATCH /api/ugc/submissions/[id]/approve
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();

  // Confirm user is vendor of this campaign OR admin
  const { data: submission } = await db
    .from('ugc_submissions')
    .select('id, status, campaign_id, ugc_campaigns!campaign_id(brand_id, vendors!brand_id(user_id))')
    .eq('id', id)
    .single();

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 409 });

  const campaign = submission.ugc_campaigns as unknown as {
    brand_id: string;
    vendors: { user_id: string } | null;
  };

  const { data: adminRole } = await db
    .from('user_roles')
    .select('id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();

  if (!adminRole && campaign.vendors?.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: updated, error } = await db
    .from('ugc_submissions')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify influencer
  const { data: influencer } = await db
    .from('influencers')
    .select('user_id')
    .eq('id', (updated as { influencer_id: string }).influencer_id)
    .single();

  if (influencer) {
    await db.from('notifications').insert({
      user_id: influencer.user_id,
      type: 'influencer',
      title: 'Submission Approved! 🎉',
      message: 'Your content submission has been approved and will start earning views-based payouts.',
      data: { submission_id: id },
    });
  }

  return NextResponse.json({ submission: updated });
}
