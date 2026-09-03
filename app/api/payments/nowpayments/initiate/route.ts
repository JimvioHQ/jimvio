import { NextRequest, NextResponse } from 'next/server'
import { createNowPaymentsInvoice } from '@/lib/nowpayments'
import { orderTotalsForUsdGateway } from '@/lib/money'
import { buildNowPaymentsOrderDescription } from '@/lib/invoice-order-description'
import { createClient } from '@supabase/supabase-js'
import { requireSessionUser, notFoundIfInvalidId } from '@/lib/auth/require-session'
import { getSupabaseSecretKey, getSupabaseUrl } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey()
)

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser()
    if ('error' in session) return session.error

    const { orderId, orderIds: rawOrderIds, payCurrency } = await req.json()
    const orderIds: string[] = Array.isArray(rawOrderIds) ? rawOrderIds : [orderId].filter(Boolean)

    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'Missing orderId or orderIds' }, { status: 400 })
    }
    for (const id of orderIds) {
      const bad = notFoundIfInvalidId(id)
      if (bad) return bad
    }

    const primaryOrderId = orderIds[0]

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
      .eq('buyer_id', session.user.id)

    if (error || !orders || orders.length === 0 || orders.length !== orderIds.length) {
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

    const invoiceId = String(result.invoiceId || `nowp-inv-${primaryOrderId}-${Date.now()}`)

    // Pending transaction enables audit trail. IPN uses payment_id as
    // provider_transaction_id; we also store invoice_id for reconciliation.
    for (const o of orders) {
      const lineAmount = Number(o.total_amount || 0)
      const lineTotals = orderTotalsForUsdGateway(lineAmount, o.currency)
      const { error: txInsertError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        order_id: o.id,
        type: 'payment',
        amount: lineTotals.amount,
        currency: lineTotals.currency,
        status: 'pending',
        provider: 'nowpayments',
        provider_transaction_id: `nowp-invoice-${invoiceId}-${o.id}`,
        reference: invoiceId,
        description: `NOWPayments invoice for order ${o.order_number || o.id.slice(0, 8)}`,
        metadata: {
          invoice_url: result.invoiceUrl,
          invoice_id: invoiceId,
          purpose: 'order_payment',
        },
      })
      if (txInsertError) {
        console.warn('[NowPayments Initiate] pending tx insert failed', o.id, txInsertError.message)
      }
    }

    // Save payment provider to all orders
    await supabase
      .from('orders')
      .update({
        payment_provider: 'nowpayments',
        gateway_used:     'nowpayments',
        updated_at:       new Date().toISOString(),
      })
      .in('id', orders.map((row) => row.id))

    return NextResponse.json({ invoiceUrl: result.invoiceUrl })

  } catch (err) {
    console.error('[NowPayments Initiate]', err)
    const message = err instanceof Error ? err.message : 'Invoice creation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
