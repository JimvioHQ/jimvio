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

    if (orderIds.length === 0 || orderIds.length > 50 || new Set(orderIds).size !== orderIds.length || orderIds.join(',').length > 240) {
      return NextResponse.json({ error: 'Provide a valid, unique order list.' }, { status: 400 })
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
        status,
        payment_status,
        jimvio_store_id,
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

    if (orders.some((row) =>
      ["paid", "completed", "refunded", "cancelled"].includes(String(row.payment_status).toLowerCase()) ||
      ["cancelled", "refunded"].includes(String(row.status).toLowerCase())
    )) {
      return NextResponse.json({ error: 'One or more orders can no longer be paid.' }, { status: 409 })
    }

    // Reuse the same invoice on retries. Never create a second crypto invoice
    // while an existing provider session is still awaiting payment.
    const { data: otherProviderTx, error: otherProviderError } = await supabase
      .from('transactions')
      .select('id, provider')
      .in('order_id', orderIds)
      .neq('provider', 'nowpayments')
      .in('status', ['pending', 'processing'])
      .limit(1)
    if (otherProviderError) {
      return NextResponse.json({ error: 'Could not verify the current payment state.' }, { status: 503 })
    }
    if (otherProviderTx?.length) {
      return NextResponse.json({ error: 'Another payment is already active for this order. Finish it from Orders first.' }, { status: 409 })
    }

    const { data: existingRows, error: existingError } = await supabase
      .from('transactions')
      .select('id, order_id, reference, provider_transaction_id, created_at, status, metadata')
      .in('order_id', orderIds)
      .eq('provider', 'nowpayments')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
    if (existingError) {
      return NextResponse.json({ error: 'Could not verify the existing crypto payment.' }, { status: 503 })
    }
    if (existingRows?.length) {
      const latestByOrder = new Map<string, typeof existingRows[number]>()
      for (const row of existingRows) {
        if (!latestByOrder.has(row.order_id)) latestByOrder.set(row.order_id, row)
      }
      const sessions = orderIds.map((id) => latestByOrder.get(id))
      const invoiceIds = new Set(sessions.map((row) => {
        const metadata = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? row.metadata as Record<string, unknown>
          : {}
        return String(metadata.invoice_id ?? row?.reference ?? '')
      }))
      const invoiceUrls = new Set(sessions.map((row) => {
        const metadata = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? String((row.metadata as Record<string, unknown>).invoice_url ?? '')
          : ''
        return metadata
      }))
      const allOrdersHaveSession = sessions.every(Boolean)
      const invoiceUrl = sessions[0]?.metadata && typeof sessions[0].metadata === 'object' && !Array.isArray(sessions[0].metadata)
        ? String((sessions[0].metadata as Record<string, unknown>).invoice_url ?? '')
        : ''
      if (allOrdersHaveSession && invoiceIds.size === 1 && invoiceUrls.size === 1 && invoiceUrl.startsWith('https://')) {
        return NextResponse.json({ invoiceUrl, reused: true })
      }
      return NextResponse.json({ error: 'An existing crypto payment needs to be resolved from Orders before another invoice can be created.' }, { status: 409 })
    }

    const { data: completedRows, error: completedError } = await supabase
      .from('transactions')
      .select('id')
      .in('order_id', orderIds)
      .eq('status', 'completed')
      .limit(1)
    if (completedError) {
      return NextResponse.json({ error: 'Could not verify the completed payment state.' }, { status: 503 })
    }
    if (completedRows?.length) {
      return NextResponse.json({ error: 'A payment was already received and is being confirmed. Please check Orders.' }, { status: 409 })
    }

    type BuyerProfile = { email: string | null }
    const rawProfiles = order.profiles as BuyerProfile | BuyerProfile[] | null
    const buyerProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles

    const lineTotals = orders.map((o) =>
      orderTotalsForUsdGateway(Number(o.total_amount || 0), o.currency)
    )
    const amount = Math.round(lineTotals.reduce((sum, line) => sum + Number(line.amount || 0), 0) * 100) / 100
    const currency = 'USD'

    const lineItems = orders.flatMap((o) => {
      const items = o.order_items
      return Array.isArray(items)
        ? (items as { product_name: string | null | undefined; quantity: number | null | undefined }[])
        : []
    })
    const description = orders.length === 1 
      ? buildNowPaymentsOrderDescription(order.order_number, lineItems)
      : `Jimvio Bundle (${orders.length} vendors)`

    let storeHandle: string | null = null
    const storeId = (order as { jimvio_store_id?: string | null }).jimvio_store_id
    if (storeId) {
      const { data: storeRow } = await supabase
        .from('jimvio_stores')
        .select('handle')
        .eq('id', storeId)
        .maybeSingle()
      storeHandle = storeRow?.handle ?? null
    }

    const { buildCustomerPaymentReturnUrls } = await import(
      '@/lib/payments/customer-return-origin'
    )
    const returns = buildCustomerPaymentReturnUrls({
      orderId: primaryOrderId,
      storeHandle,
      request: req,
      queryExtra: { provider: 'nowpayments' },
    })

    const result = await createNowPaymentsInvoice({
      jimvioOrderId: orderIds.join(','),
      amount,
      currency,
      payCurrency,
      description,
      buyerEmail:    buyerProfile?.email || '',
      successUrl:    returns.successUrl,
      cancelUrl:     returns.cancelUrl,
    })

    const invoiceId = String(result.invoiceId || `nowp-inv-${primaryOrderId}-${Date.now()}`)

    // Pending transaction enables audit trail. IPN uses payment_id as
    // provider_transaction_id; we also store invoice_id for reconciliation.
    for (const o of orders) {
      const lineAmount = Number(o.total_amount || 0)
      const orderLineTotal = orderTotalsForUsdGateway(lineAmount, o.currency)
      const { error: txInsertError } = await supabase.from('transactions').insert({
        user_id: session.user.id,
        order_id: o.id,
        type: 'payment',
        amount: orderLineTotal.amount,
        currency: orderLineTotal.currency,
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
