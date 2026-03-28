// app/api/payments/pesapal/initiate/route.ts
// Called by Jimvio frontend to start a PesaPal payment
// Returns: { redirectUrl } — frontend redirects buyer there

import { NextRequest, NextResponse } from 'next/server'
import { createPesapalOrder, registerPesapalIPN } from '@/lib/pesapal'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

const supabase = createServiceRoleClient()

export async function POST(req: NextRequest) {
  try {
    const { orderId, orderIds: rawOrderIds } = await req.json()
    const orderIds: string[] = Array.isArray(rawOrderIds) ? rawOrderIds : [orderId].filter(Boolean)
    
    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'Missing orderId or orderIds' }, { status: 400 })
    }

    const primaryOrderId = orderIds[0]

    // Fetch all orders + buyer profile
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        currency,
        shipping_address,
        profiles!orders_buyer_id_fkey (
          full_name,
          email,
          phone
        )
      `)
      .in('id', orderIds)

    if (error || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Orders not found' }, { status: 404 })
    }

    const order = orders.find(o => o.id === primaryOrderId) || orders[0]

    type BuyerProfile = { full_name: string | null; email: string | null; phone: string | null }
    const rawProfiles = order.profiles as BuyerProfile | BuyerProfile[] | null
    const buyerProfile = Array.isArray(rawProfiles) ? rawProfiles[0] : rawProfiles

    type ShippingJson = {
      firstName?: string
      lastName?: string
      email?: string
      phone?: string
      address1?: string
      address2?: string
      city?: string
      country?: string
      country_code?: string
      zip?: string
    }
    const ship = order.shipping_address as ShippingJson | null

    const profileName = (buyerProfile?.full_name || 'Customer').split(' ')
    const firstName = ship?.firstName?.trim() || profileName[0] || 'Customer'
    const lastName =
      ship?.lastName?.trim() || profileName.slice(1).join(' ') || firstName

    const email = ship?.email?.trim() || buyerProfile?.email?.trim() || ''
    const phone = ship?.phone?.trim() || buyerProfile?.phone?.trim() || ''
    if (!email && !phone) {
      return NextResponse.json(
        { error: 'PesaPal requires a buyer email or phone. Update your profile or checkout shipping details.' },
        { status: 400 }
      )
    }

    let amount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid aggregate order amount' }, { status: 400 })
    }

    let currency = (order.currency || 'USD').toUpperCase()
    const rate = parseFloat(process.env.RWF_TO_USD_RATE || '0.0008')
    if (currency === 'RWF' && rate > 0) {
      amount = Math.round(amount * rate * 100) / 100
      currency = 'USD'
    }

    const forceCurrency = process.env.PESAPAL_CHECKOUT_CURRENCY?.trim().toUpperCase()
    if (forceCurrency === 'RWF' && currency === 'USD' && rate > 0) {
      amount = Math.max(1, Math.round(amount / rate))
      currency = 'RWF'
    }

    // Register IPN webhook URL with PesaPal
    const ipnId = await registerPesapalIPN()

    // Create PesaPal payment request
    const description = orders.length === 1 
      ? `Jimvio Order ${order.order_number}`
      : `Jimvio Multi-Order (${orders.length} vendors)`

    // Generate a unique merchant reference for this ATTEMPT to satisfy PesaPal uniqueness rules
    // PesaPal max length for merchant reference is 50 chars. UUID (36) + timestamp (13/14) = ~50
    const merchantRef = `${primaryOrderId}:${Date.now()}`

    const result = await createPesapalOrder({
      jimvioOrderId: merchantRef, // Use unique Ref to avoid PesaPal rejection on repeat attempts
      amount,
      currency,
      description,
      ipnId,
      buyer: {
        email,
        firstName,
        lastName,
        phone,
        line1: ship?.address1,
        line2: ship?.address2,
        city: ship?.city,
        countryCode: ship?.country_code,
        zipCode: ship?.zip,
      },
    })

    // Save merchant ref to all orders in the batch
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        pesapal_merchant_ref: merchantRef,
        payment_provider:     'pesapal',
        updated_at:           new Date().toISOString(),
      })
      .in('id', orderIds)

    if (updateError) {
      console.error('[PesaPal Initiate] DB Update Error:', updateError)
      return NextResponse.json({ error: `Could not link payment to order: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ redirectUrl: result.redirectUrl })

  } catch (err) {
    console.error('[PesaPal Initiate]', err)
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Payment initiation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
