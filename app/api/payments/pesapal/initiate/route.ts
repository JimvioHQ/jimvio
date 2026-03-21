// app/api/payments/pesapal/initiate/route.ts
// Called by Jimvio frontend to start a PesaPal payment
// Returns: { redirectUrl } — frontend redirects buyer there

import { NextRequest, NextResponse } from 'next/server'
import { createPesapalOrder, registerPesapalIPN } from '@/lib/pesapal'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch order + buyer profile
    const { data: order, error } = await supabase
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
      .eq('id', orderId)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

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

    let amount = Number(order.total_amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 })
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

    // Create PesaPal payment request (billing_address matches API 3.0 docs)
    const result = await createPesapalOrder({
      jimvioOrderId: orderId,
      amount,
      currency,
      description: `Jimvio Order ${order.order_number}`,
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

    // Save merchant ref to order
    await supabase
      .from('orders')
      .update({
        pesapal_merchant_ref: orderId,
        payment_provider:     'pesapal',
        updated_at:           new Date().toISOString(),
      })
      .eq('id', orderId)

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
