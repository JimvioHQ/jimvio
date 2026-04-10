import { NextRequest, NextResponse } from 'next/server';
import { createPesapalOrder, registerPesapalIPN } from '@/lib/pesapal';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const supabase = createServiceRoleClient();

/**
 * PAYMENT REQUEST API
 * Endpoint: /api/pesapal/pay
 * Method: POST
 * Accepts: amount, email, orderId (optional)
 * Initiates a PesaPal payment and returns the redirect URL.
 */
export async function POST(req: NextRequest) {
  try {
    const { amount, email, orderId: incomingOrderId, firstName = 'Customer', lastName = 'User' } = await req.json();

    if (!amount || !email) {
      return NextResponse.json({ error: 'Amount and Email are required' }, { status: 400 });
    }

    // 1. Generate unique internal references
    const orderId = incomingOrderId || randomUUID();
    const merchantRef = `${orderId}:${Date.now()}`;

    // 2. Register IPN ID (PesaPal requirements)
    const ipnId = await registerPesapalIPN();

    // 3. Initiate Payment with PesaPal
    const result = await createPesapalOrder({
      jimvioOrderId: merchantRef,
      amount: Number(amount),
      currency: 'USD', // Defaulting to USD for global
      description: `Payment for Order ${orderId.slice(0, 8)}`,
      ipnId,
      buyer: {
        email,
        firstName,
        lastName,
      },
    });

    // 4. Save to Database (payments table)
    // We use the service role to ensure bypass of RLS for this system operation
    const { error: dbError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId, // internal reference
        email,
        amount: Number(amount),
        tracking_id: result.orderTrackingId,
        merchant_ref: merchantRef,
        status: 'pending'
      });
    
    // Note: If 'payments' table doesn't exist yet, we fall back to logging.
    // In a real flow, you should run the SQL schema first.
    if (dbError) {
      console.warn('[PesaPal Pay API] Could not save to payments table:', dbError.message);
      // We still return the redirectUrl as the PesaPal order was successfully created
    }

    return NextResponse.json({ 
      redirect_url: result.redirectUrl,
      tracking_id: result.orderTrackingId 
    });

  } catch (error) {
    console.error('[PesaPal Pay API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
