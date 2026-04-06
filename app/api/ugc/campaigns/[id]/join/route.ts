import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceRoleClient();
  
  // 1. Resolve Influencer ID
  const { data: influencer } = await db
    .from('influencers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!influencer) {
    return NextResponse.json({ error: 'Complete your influencer profile first.' }, { status: 403 });
  }

  // 2. Prevent Duplicate Participation
  const { data: existing } = await db
    .from('ugc_campaign_participants')
    .select('id')
    .eq('campaign_id', id)
    .eq('influencer_id', influencer.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'You are already a participant in this campaign.' }, { status: 409 });
  }

  // 3. Join Campaign
  const { error } = await db
    .from('ugc_campaign_participants')
    .insert({
      campaign_id: id,
      influencer_id: influencer.id,
      status: 'accepted',
      joined_at: new Date().toISOString()
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
