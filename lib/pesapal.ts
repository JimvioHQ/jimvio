// lib/pesapal.ts
// PesaPal API client for Jimvio
// Docs: https://developer.pesapal.com
//
// Environment → API base (PESAPAL_ENV):
//   sandbox → https://cybqa.pesapal.com/pesapalv3
//   live    → https://pay.pesapal.com/v3

const PESAPAL_BASE_URL =
  process.env.PESAPAL_ENV === "live"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3"

/** Trim, strip BOM/CR, strip one layer of surrounding " or ' (common .env mistakes). */
function normalizePesapalCredential(raw: string | undefined): string {
  if (raw == null) return ""
  let v = raw.replace(/\r/g, "").replace(/^\uFEFF/, "").trim()
  if (v.length >= 2) {
    const a = v[0]
    const b = v[v.length - 1]
    if ((a === '"' && b === '"') || (a === "'" && b === "'")) {
      v = v.slice(1, -1).trim()
    }
  }
  return v
}

// Cache token in memory (valid for 4 hours)
let cachedToken: { token: string; expiresAt: number } | null = null

/** Matches PesaPal API 3.0 error object (docs use `type`; some responses use `error_type`). */
type PesapalAuthJson = {
  token?: string
  error?: {
    type?: string
    error_type?: string
    code?: string
    message?: string
  }
  status?: string
  message?: string
}

function pesapalAuthErrorMessage(data: PesapalAuthJson): string {
  const code = data.error?.code
  if (code === "invalid_consumer_key_or_secret_provided") {
    const env = process.env.PESAPAL_ENV === "live" ? "live" : "sandbox"
    return (
      `PesaPal rejected your credentials (${env}). Open https://developer.pesapal.com → download the current API 3.0 ` +
      `test credentials (sandbox) or use live keys only with PESAPAL_ENV=live. Paste key and secret into .env as a matching pair; ` +
      `restart the dev server. If it still fails, regenerate credentials in the PesaPal dashboard (old demo keys expire).`
    )
  }
  if (code) {
    return `PesaPal authentication failed (${code}).`
  }
  return 'PesaPal authentication failed. Check API credentials and PESAPAL_ENV.'
}

export async function getPesapalToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const key = normalizePesapalCredential(process.env.PESAPAL_CONSUMER_KEY)
  const secret = normalizePesapalCredential(process.env.PESAPAL_CONSUMER_SECRET)
  if (!key || !secret) {
    throw new Error(
      'PesaPal is not configured: set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in your environment.'
    )
  }

  const url = `${PESAPAL_BASE_URL}/api/Auth/RequestToken`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      consumer_key: key,
      consumer_secret: secret,
    }),
  })

  const data = (await res.json()) as PesapalAuthJson
  if (!data.token) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PesaPal] RequestToken failed", {
        httpStatus: res.status,
        url,
        keyLength: key.length,
        secretLength: secret.length,
        pesapalBody: data,
      })
    }
    throw new Error(pesapalAuthErrorMessage(data))
  }

  cachedToken = {
    token:     data.token,
    expiresAt: Date.now() + 4 * 60 * 60 * 1000,
  }
  return data.token
}

export async function registerPesapalIPN(): Promise<string> {
  const token = await getPesapalToken()

  const res = await fetch(`${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:         'application/json',
      Authorization:  `Bearer ${token}`,
    },
    body: JSON.stringify({
      url:                   `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/pesapal`,
      ipn_notification_type: 'GET',
    }),
  })

  const data = await res.json()
  if (!data.ipn_id) throw new Error(`PesaPal IPN registration failed: ${JSON.stringify(data)}`)
  return data.ipn_id
}

export interface PesapalOrderParams {
  jimvioOrderId: string
  amount: number
  currency: string
  description: string
  ipnId: string
  buyer: {
    email: string
    firstName: string
    lastName: string
    phone?: string
    /** API 3.0 Customer Address — line_1 / line_2 */
    line1?: string
    line2?: string
    city?: string
    /** ISO 3166-1 alpha-2 */
    countryCode?: string
    state?: string
    postalCode?: string
    zipCode?: string
  }
}

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || ""

type PesapalSubmitJson = {
  redirect_url?: string
  order_tracking_id?: string
  error?: { error_type?: string; code?: string; message?: string }
  status?: string
}

function pesapalSubmitErrorMessage(data: PesapalSubmitJson): string {
  const code = data.error?.code
  const msg = data.error?.message?.trim()
  if (code === "general_system_decline_error") {
    return (
      `PesaPal could not create the payment (${code}). ` +
      (msg ? `${msg} ` : "") +
      `Common fixes: (1) Set PESAPAL_CHECKOUT_CURRENCY=RWF in .env when using Rwanda sandbox merchant keys with USD-priced orders — we convert using RWF_TO_USD_RATE. ` +
      `(2) Use a public https URL for NEXT_PUBLIC_APP_URL (e.g. ngrok) if sandbox rejects localhost. ` +
      `(3) Retry later if PesaPal sandbox is busy.`
    )
  }
  if (msg) return `PesaPal order failed: ${msg}`
  if (code) return `PesaPal order failed (${code}).`
  return `PesaPal order failed: ${JSON.stringify(data)}`
}

export async function createPesapalOrder(params: PesapalOrderParams) {
  const token = await getPesapalToken()

  // Merchant reference: max 50 chars; allowed: alphanumeric, - _ . :
  const id = params.jimvioOrderId.length <= 50 ? params.jimvioOrderId : params.jimvioOrderId.slice(0, 50)
  const description = params.description.slice(0, 100)
  const currency = (params.currency || "USD").toUpperCase()
  const rawAmount = Number(params.amount)
  const amount =
    currency === "RWF"
      ? Math.max(1, Math.round(rawAmount))
      : Math.round(rawAmount * 100) / 100

  const b = params.buyer
  const country = (b.countryCode || "RW").toUpperCase().slice(0, 2)
  const appUrl = APP_URL()
  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not set. PesaPal requires absolute callback URLs (e.g. http://localhost:3000 for local dev)."
    )
  }
  const phone = (b.phone || "").replace(/\s+/g, "").trim()

  const billing_address: Record<string, string> = {
    country_code: country,
    first_name: b.firstName,
    middle_name: "",
    last_name: b.lastName,
    line_1: (b.line1 || "").trim() || "—",
    line_2: (b.line2 || "").trim(),
    city: (b.city || "").trim(),
    state: (b.state || "").slice(0, 3),
  }
  const email = (b.email || "").trim()
  if (email) billing_address.email_address = email
  if (phone) billing_address.phone_number = phone
  const pc = (b.postalCode ?? "").toString().trim()
  const zc = (b.zipCode ?? "").toString().trim()
  if (pc !== "") billing_address.postal_code = pc
  if (zc !== "") billing_address.zip_code = zc

  const payload: Record<string, unknown> = {
    id,
    currency,
    amount,
    description,
    /** Per API 3.0 docs — full top-level redirect (avoids iframe/parent-window quirks with their card UI). */
    redirect_mode: "TOP_WINDOW",
    callback_url: `${appUrl}/checkout/success`,
    notification_id: params.ipnId,
    billing_address,
  }

  if (appUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(appUrl)) {
    payload.cancellation_url = `${appUrl}/checkout/cancel`
  }

  const res = await fetch(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as PesapalSubmitJson
  if (!data.redirect_url) {
    throw new Error(pesapalSubmitErrorMessage(data))
  }

  return {
    redirectUrl:     data.redirect_url,
    orderTrackingId: data.order_tracking_id,
  }
}

export async function verifyPesapalTransaction(orderTrackingId: string) {
  const token = await getPesapalToken()

  const res = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
    {
      headers: {
        Accept:        'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  return res.json()
}
