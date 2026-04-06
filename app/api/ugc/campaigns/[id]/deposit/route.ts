import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { randomUUID } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (!isUUID) return NextResponse.json({ error: 'Invalid campaign ID format' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { phone } = body;
  
  if (!phone) {
    return NextResponse.json({ error: 'A valid funding phone number is required.' }, { status: 400 });
  }

  const db = createServiceRoleClient();

  // Ensure campaign belongs to brand
  const { data: campaign } = await db
    .from('ugc_campaigns')
    .select('*, vendors!brand_id(user_id)')
    .eq('id', id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const vendor = campaign.vendors as unknown as { user_id: string };
  if (vendor.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden - User does not own this campaign' }, { status: 403 });
  }

  // Check if escrow already firmly exists
  const { data: existingEscrow } = await db
    .from('ugc_campaign_escrow')
    .select('id')
    .eq('campaign_id', id)
    .maybeSingle();

  if (existingEscrow) {
    return NextResponse.json({ error: 'Campaign already has funds locked in escrow.' }, { status: 409 });
  }

  // --- MOCKED DEPOSIT: For sandbox we simulate an immediate successful deposit locking
  // Real implementation would invoke pawapay/afripay here via server action
  const escrowInsert = await db.from('ugc_campaign_escrow').insert({
    campaign_id: id,
    deposited_by: user.id,
    amount: campaign.total_budget,
    currency: 'RWF',
    status: 'held',
    payment_method: 'mobile_money',
    payment_ref: `MOCK_TX_${randomUUID()}`
  });

  if (escrowInsert.error) {
    return NextResponse.json({ error: escrowInsert.error.message }, { status: 500 });
  }

  return NextResponse.json({ 
    success: true, 
    message: 'Campaign budget successfully deposited and locked in escrow.' 
  });
}
