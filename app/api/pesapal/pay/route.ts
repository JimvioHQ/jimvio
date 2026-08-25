import { NextRequest, NextResponse } from 'next/server';
import { createPesapalOrder, registerPesapalIPN } from '@/lib/pesapal';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { requireSessionUser, notFoundIfInvalidId } from '@/lib/auth/require-session';

export const dynamic = 'force-dynamic';

const supabase = createServiceRoleClient();

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser();
    if ('error' in session) return session.error;

    const { orderId: incomingOrderId } = await req.json();
    if (!incomingOrderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }
    const bad = notFoundIfInvalidId(incomingOrderId);
    if (bad) return bad;

    const { data: order } = await supabase
      .from('orders')
      .select('id, total_amount, currency, buyer_id, shipping_address')
      .eq('id', incomingOrderId)
      .eq('buyer_id', session.user.id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const amount = Number(order.total_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const ship = (order.shipping_address ?? {}) as { email?: string; firstName?: string; lastName?: string };
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', session.user.id)
      .maybeSingle();
    const email = ship.email?.trim() || profile?.email?.trim() || session.user.email || '';
    if (!email) {
      return NextResponse.json({ error: 'Buyer email is required' }, { status: 400 });
    }

    const merchantRef = `${order.id}:${Date.now()}`;
    const ipnId = await registerPesapalIPN();
    const nameParts = (profile?.full_name || 'Customer').split(' ');

    const result = await createPesapalOrder({
      jimvioOrderId: merchantRef,
      amount,
      currency: order.currency || 'USD',
      description: `Payment for Order ${order.id.slice(0, 8)}`,
      ipnId,
      buyer: {
        email,
        firstName: ship.firstName?.trim() || nameParts[0] || 'Customer',
        lastName: ship.lastName?.trim() || nameParts.slice(1).join(' ') || 'User',
      },
    });

    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        email,
        amount,
        tracking_id: result.orderTrackingId,
        merchant_ref: merchantRef,
        status: 'pending'
      });

    if (dbError) {
      console.warn('[PesaPal Pay API] Could not save to payments table:', dbError.message);
    }

    return NextResponse.json({
      redirect_url: result.redirectUrl,
      tracking_id: result.orderTrackingId
    });

  } catch (error) {
    console.error('[PesaPal Pay API] Error:', error instanceof Error ? error.message : 'error');
    return NextResponse.json(
      { error: 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
