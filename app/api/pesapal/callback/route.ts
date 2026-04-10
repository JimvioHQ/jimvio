import { NextRequest, NextResponse } from 'next/server';
import { verifyPesapalTransaction } from '@/lib/pesapal';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

const supabase = createServiceRoleClient();

/**
 * CALLBACK HANDLER
 * Endpoint: /api/pesapal/callback
 * Method: GET
 * Handles the user redirect back from PesaPal.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trackingId = searchParams.get('OrderTrackingId');
  const merchantRef = searchParams.get('OrderMerchantReference');

  if (!trackingId) {
    return NextResponse.redirect(new URL('/checkout/error?msg=Missing tracking ID', req.url));
  }

  try {
    // 1. Verify payment status securely via PesaPal API
    const statusData = await verifyPesapalTransaction(trackingId);
    
    // PesaPal status values: 0 = Pending, 1 = Completed, 2 = Failed, 3 = Cancelled
    const statusCode = statusData.status_code;
    const isSuccess = statusCode === 1;

    // 2. Update Database (payments table)
    const dbStatus = isSuccess ? 'completed' : (statusCode === 2 ? 'failed' : 'pending');
    
    await supabase
      .from('payments')
      .update({ 
        status: dbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('tracking_id', trackingId);

    // 3. Optional: If it's a specific order, update the orders table too
    // This maintains compatibility with Jimvio's existing order system
    if (merchantRef) {
      const actualOrderId = merchantRef.split(':')[0];
      await supabase
        .from('orders')
        .update({ 
          payment_status: isSuccess ? 'paid' : 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', actualOrderId);
    }

    // 4. Redirect user to success or failure page
    if (isSuccess) {
      return NextResponse.redirect(new URL(`/checkout/success?tracking_id=${trackingId}`, req.url));
    } else {
      return NextResponse.redirect(new URL(`/checkout/error?msg=Payment failed (Code: ${statusCode})`, req.url));
    }

  } catch (error) {
    console.error('[PesaPal Callback API] Error:', error);
    return NextResponse.redirect(new URL('/checkout/error?msg=Verification failed', req.url));
  }
}
