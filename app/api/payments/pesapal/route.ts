// app/api/payments/pesapal/route.ts
// PesaPal IPN webhook — called by PesaPal after payment
// PesaPal sends a GET request with order tracking info

import { NextRequest, NextResponse } from 'next/server'
import { verifyPesapalTransaction } from '@/lib/pesapal'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderTrackingId  = searchParams.get('OrderTrackingId') || ''
    const orderMerchantRef = searchParams.get('OrderMerchantReference') || ''

    if (!orderTrackingId || !orderMerchantRef) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 })
    }

    // Verify payment status directly with PesaPal API
    const status = await verifyPesapalTransaction(orderTrackingId)

    if (status.payment_status_description === 'Completed') {
      // Check if orders exist and status of at least one
      const { data: firstOrder } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('pesapal_merchant_ref', orderMerchantRef)
        .limit(1)
        .maybeSingle()

      if (firstOrder?.payment_status === 'paid') {
        return NextResponse.json({ received: true, status: 'already_processed' })
      }

      // Update all orders in the batch with PesaPal tracking ID
      await supabase
        .from('orders')
        .update({
          payment_status:      'paid',
          status:              'processing',
          payment_provider:    'pesapal',
          pesapal_tracking_id: orderTrackingId,
          paid_at:             new Date().toISOString(),
          updated_at:          new Date().toISOString(),
        })
        .eq('pesapal_merchant_ref', orderMerchantRef)

      const { handleSuccessfulPayment } = await import('@/services/paymentService')
      await handleSuccessfulPayment({
        jimvioOrderId:   orderMerchantRef,
        paymentProvider: 'pesapal',
        paymentRef:      orderTrackingId,
      })
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[PesaPal IPN]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
