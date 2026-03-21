// app/api/payments/nowpayments/route.ts
// NowPayments IPN webhook — called by NowPayments after crypto payment
// NowPayments sends a POST request with payment status updates

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyNowPaymentsSignature,
  isPaymentComplete,
  isPaymentFailed,
} from '@/lib/nowpayments'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const rawBody   = await req.text()
    const signature = req.headers.get('x-nowpayments-sig') || ''

    // Verify signature to confirm request is from NowPayments
    if (!verifyNowPaymentsSignature(rawBody, signature)) {
      console.warn('[NowPayments IPN] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(rawBody)
    const jimvioOrderId = event.order_id as string
    const paymentId     = String(event.payment_id)
    const status        = event.payment_status as string

    if (!jimvioOrderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 })
    }

    // Handle payment completed
    if (isPaymentComplete(status)) {
      // Check order not already paid (prevent double processing)
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('id', jimvioOrderId)
        .single()

      if (order?.payment_status === 'paid') {
        return NextResponse.json({ received: true, status: 'already_processed' })
      }

      // Update order with NowPayments payment ID
      await supabase
        .from('orders')
        .update({
          payment_status:        'paid',
          status:                'processing',
          payment_provider:      'nowpayments',
          nowpayments_payment_id: parseInt(paymentId, 10),
          paid_at:               new Date().toISOString(),
          updated_at:            new Date().toISOString(),
        })
        .eq('id', jimvioOrderId)

      const { handleSuccessfulPayment } = await import('@/services/paymentService')
      await handleSuccessfulPayment({
        jimvioOrderId,
        paymentProvider: 'nowpayments',
        paymentRef:      paymentId,
        paymentId,
      })
    }

    // Handle payment failed
    if (isPaymentFailed(status)) {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status:         'cancelled',
          updated_at:     new Date().toISOString(),
        })
        .eq('id', jimvioOrderId)
    }

    return NextResponse.json({ received: true })

  } catch (err) {
    console.error('[NowPayments IPN]', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
