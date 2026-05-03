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
    const { orderId, orderIds: rawOrderIds, payCurrency } = await req.json()
    const orderIds: string[] = Array.isArray(rawOrderIds) ? rawOrderIds : [orderId].filter(Boolean)

    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'Missing orderId or orderIds' }, { status: 400 })
    }

    const primaryOrderId = orderIds[0]

    // Fetch all orders + buyer email
    const { data: orders, error } = await supabase
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
      .in('id', orderIds)

    if (error || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 })
    }

    const order = orders.find(o => o.id === primaryOrderId) || orders[0]

    type BuyerProfile = { email: string | null }
    const rawProfiles = order.profiles as BuyerProfile | BuyerProfile[] | null
    const buyerProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    const { amount, currency } = orderTotalsForUsdGateway(
      totalAmount,
      order.currency
    )

    const lineItems = orders.flatMap(o => (o.order_items as any[] || []))
    const description = orders.length === 1 
      ? buildNowPaymentsOrderDescription(order.order_number, lineItems)
      : `Jimvio Bundle (${orders.length} vendors)`

    const result = await createNowPaymentsInvoice({
      jimvioOrderId: primaryOrderId,
      amount,
      currency,
      payCurrency,
      description,
      buyerEmail:    buyerProfile?.email || '',
    })

    // Save payment provider to all orders
    await supabase
      .from('orders')
      .update({
        payment_provider: 'nowpayments',
        gateway_used:     'nowpayments',
        updated_at:       new Date().toISOString(),
      })
      .in('id', orderIds)

    return NextResponse.json({ invoiceUrl: result.invoiceUrl })

  } catch (err) {
    console.error('[NowPayments Initiate]', err)
    const message = err instanceof Error ? err.message : 'Invoice creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
