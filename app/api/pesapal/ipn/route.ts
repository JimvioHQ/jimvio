import { NextRequest, NextResponse } from 'next/server';
import { verifyPesapalTransaction } from '@/lib/pesapal';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const supabase = createServiceRoleClient();

/**
 * IPN (WEBHOOK) HANDLER
 * Endpoint: /api/pesapal/ipn
 * Method: POST (or GET depending on PesaPal config, usually POST for IPN v3)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const trackingId = body.OrderTrackingId;
    const notificationType = body.NotificationType; // IPNCHANGE

    if (!trackingId) {
      return NextResponse.json({ error: 'Missing Tracking ID' }, { status: 400 });
    }

    // 1. Fetch transaction status from PesaPal
    const statusData = await verifyPesapalTransaction(trackingId);
    const statusCode = statusData.status_code;
    const isSuccess = statusCode === 1;

    // 2. Fetch current payment status from DB to ensure idempotency
    const { data: currentPayment, error: fetchError } = await supabase
      .from('payments')
      .select('status, order_id')
      .eq('tracking_id', trackingId)
      .single();

    if (fetchError || !currentPayment) {
      // If we don't recognize this tracking ID, it might be from another system or an error
      console.warn('[PesaPal IPN] Unknown tracking ID:', trackingId);
      return NextResponse.json({ status: 'OK' }); // Return OK to PesaPal to stop retries
    }

    if (currentPayment.status === 'completed') {
      // Already processed, avoid duplicate updates
      return NextResponse.json({ status: 'OK' });
    }

    // 3. Update Database (payments + orders)
    const dbStatus = isSuccess ? 'completed' : (statusCode === 2 ? 'failed' : 'pending');

    const { error: updateError } = await supabase
      .from('payments')
      .update({ 
        status: dbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('tracking_id', trackingId);

    if (isSuccess && currentPayment.order_id) {
      await supabase
        .from('orders')
        .update({ 
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentPayment.order_id);
    }

    console.log('[PesaPal IPN] Processed notification:', { trackingId, dbStatus });

    // 4. Return success response to PesaPal (required format)
    return NextResponse.json({
      orderTrackingId: trackingId,
      status: 'OK'
    });

  } catch (error) {
    console.error('[PesaPal IPN Error]', error);
    // Returning 500 will make PesaPal retry the notification
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/**
 * Handle GET requests if PesaPal is configured to use GET for IPN notifications.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const jsonBody = Object.fromEntries(searchParams.entries());
  
  // Reuse the POST logic by wrapping it
  const dummyReq = {
    json: async () => jsonBody
  } as unknown as NextRequest;

  return POST(dummyReq);
}
