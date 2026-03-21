// app/api/payments/nowpayments/initiate/route.ts
// Called by Jimvio frontend to create a crypto payment invoice
// Returns: { invoiceUrl } — frontend redirects buyer there
// Buyer can choose which crypto to pay with on NowPayments page

import { NextRequest, NextResponse } from 'next/server'
import { createNowPaymentsInvoice } from '@/lib/nowpayments'
import { orderTotalsForUsdGateway } from '@/lib/money'
import { buildNowPaymentsOrderDescription } from '@/lib/invoice-order-description'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orderId, payCurrency = 'USDT' } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch order + buyer email
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        currency,
        profiles!orders_buyer_id_fkey (
          email
        ),
        order_items (
          product_name,
          quantity
        )
      `)
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    type BuyerProfile = { email: string | null }
    const rawProfiles = order.profiles as BuyerProfile | BuyerProfile[] | null
    const buyerProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles

    const { amount, currency } = orderTotalsForUsdGateway(
      Number(order.total_amount),
      order.currency
    )

    const lineItems = (order.order_items as { product_name: string | null; quantity: number | null }[] | null) ?? []
    const description = buildNowPaymentsOrderDescription(order.order_number, lineItems)

    const result = await createNowPaymentsInvoice({
      jimvioOrderId: orderId,
      amount,
      currency,
      payCurrency,
      description,
      buyerEmail:    buyerProfile?.email || '',
    })

    // Save payment provider to order
    await supabase
      .from('orders')
      .update({
        payment_provider: 'nowpayments',
        updated_at:       new Date().toISOString(),
      })
      .eq('id', orderId)

    return NextResponse.json({ invoiceUrl: result.invoiceUrl })

  } catch (err) {
    console.error('[NowPayments Initiate]', err)
    const message = err instanceof Error ? err.message : 'Invoice creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
