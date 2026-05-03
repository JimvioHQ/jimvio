import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(
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
  const { data: influencer } = await db
    .from('influencers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!influencer) return NextResponse.json({ status: null });

  const { data: participant } = await db
    .from('ugc_campaign_participants')
    .select('status')
    .eq('campaign_id', id)
    .eq('influencer_id', influencer.id)
    .maybeSingle();

  return NextResponse.json({ status: participant?.status || null });
}
