// lib/nowpayments.ts
// NowPayments API client for Jimvio
// Docs: https://documenter.getpostman.com/view/7907941/2s93JtP3F6

import crypto from 'crypto'

const PRODUCTION_BASE = 'https://api.nowpayments.io/v1'
const SANDBOX_BASE = 'https://api-sandbox.nowpayments.io/v1'

/** Trim, strip BOM, strip one layer of quotes — same idea as PesaPal env hygiene. */
export function normalizeNowPaymentsCredential(raw: string | undefined): string {
  if (!raw) return ''
  let s = raw.replace(/^\uFEFF/, '').replace(/\r/g, '').trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

/** Must match dashboard key: sandbox keys → api-sandbox; production keys → api.nowpayments.io */
export function getNowPaymentsBaseUrl(): string {
  const v = normalizeNowPaymentsCredential(process.env.NOWPAYMENTS_ENV).toLowerCase()
  return v === 'sandbox' ? SANDBOX_BASE : PRODUCTION_BASE
}

export function isNowPaymentsSandboxEnv(): boolean {
  return getNowPaymentsBaseUrl() === SANDBOX_BASE
}

function getNowPaymentsApiKey(): string {
  const key = normalizeNowPaymentsCredential(process.env.NOWPAYMENTS_API_KEY)
  if (!key) {
    throw new Error(
      'NOWPAYMENTS_API_KEY is not set. Add it to .env.local (NowPayments dashboard → API keys).'
    )
  }
  return key
}

export interface NowPaymentsInvoiceParams {
  jimvioOrderId: string
  amount: number
  currency: string       // price currency e.g. 'USD'
  payCurrency?: string    // optional crypto currency e.g. 'USDT', 'BTC', 'ETH'
  description: string
  buyerEmail: string
}

export async function createNowPaymentsInvoice(params: NowPaymentsInvoiceParams) {
  const apiKey = getNowPaymentsApiKey()
  const baseUrl = getNowPaymentsBaseUrl()
    const body = {
      price_amount:        params.amount,
      price_currency:      params.currency.toLowerCase(),
      order_id:            params.jimvioOrderId,
      order_description:   params.description,
      ipn_callback_url:    `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/nowpayments`,
      success_url:         `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
      cancel_url:          `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel`,
      is_fixed_rate:       false,
      is_fee_paid_by_user: false,
      ...(params.payCurrency ? { pay_currency: params.payCurrency.toLowerCase() } : {}),
    }

    const res = await fetch(`${baseUrl}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    apiKey,
      },
      body: JSON.stringify(body),
    })

  const data = (await res.json()) as Record<string, unknown> & {
    invoice_url?: string
    code?: string
    message?: string
    statusCode?: number
  }

  if (!data.invoice_url) {
    if (data.code === 'INVALID_API_KEY') {
      const rawEnv = process.env.NOWPAYMENTS_ENV
      const envHint = isNowPaymentsSandboxEnv()
        ? 'You are calling the SANDBOX API. Use an API key created while Sandbox mode is ON in Settings → API keys (or Account). If your key is for LIVE/production, set NOWPAYMENTS_ENV=production in .env.local.'
        : 'You are calling the PRODUCTION API. Use a live API key from the dashboard, or set NOWPAYMENTS_ENV=sandbox if you only have a sandbox key.'
      throw new Error(
        `NowPayments: invalid API key (${data.message ?? 'INVALID_API_KEY'}). ` +
          `Active API host: ${baseUrl} (NOWPAYMENTS_ENV="${rawEnv ?? '(unset)'}"). ` +
          `${envHint} ` +
          `Confirm .env.local has the full key, no quotes typos, and that .env is not overriding with a placeholder.`
      )
    }
    throw new Error(`NowPayments invoice failed: ${JSON.stringify(data)}`)
  }

  return {
    invoiceUrl: data.invoice_url as string,
    invoiceId:  String(data.id ?? ''),
    paymentId:
      typeof data.payment_id === 'number' ? data.payment_id : undefined,
  }
}

export function verifyNowPaymentsSignature(
  rawBody: string,
  receivedSignature: string
): boolean {
  try {
    const parsed = JSON.parse(rawBody)

    // NowPayments requires keys sorted alphabetically before hashing
    const sortedString = JSON.stringify(
      Object.keys(parsed)
        .sort()
        .reduce((acc: Record<string, unknown>, key) => {
          acc[key] = parsed[key]
          return acc
        }, {})
    )

    const expected = crypto
      .createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET!)
      .update(sortedString)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    )
  } catch {
    return false
  }
}

// NowPayments payment status progression:
// waiting → confirming → confirmed → sending → partially_paid
// → finished (✓ success) → failed → refunded → expired
export function isPaymentComplete(status: string): boolean {
  return status === 'finished'
}

export function isPaymentFailed(status: string): boolean {
  return ['failed', 'refunded', 'expired'].includes(status)
}
