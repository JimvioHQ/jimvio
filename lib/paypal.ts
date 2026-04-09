/**
 * lib/paypal.ts
 * PayPal REST API v2 integration for Jimvio
 * Docs: https://developer.paypal.com/docs/api/orders/v2/
 *
 * Flow:
 *   1. createPayPalOrder()   → returns orderId + approvalUrl
 *   2. User approves on PayPal → redirected back with token
 *   3. capturePayPalOrder()  → finalizes and captures funds
 */

const PAYPAL_BASE_URL =
  process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

/** Cache access token in memory (valid ~9h, refresh at 8h) */
let cachedPaypalToken: { token: string; expiresAt: number } | null = null;

function getPayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      "PayPal is not configured: set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env"
    );
  }
  return { clientId, secret };
}

/** Get or refresh PayPal OAuth2 access token */
export async function getPayPalToken(): Promise<string> {
  if (cachedPaypalToken && Date.now() < cachedPaypalToken.expiresAt) {
    return cachedPaypalToken.token;
  }

  const { clientId, secret } = getPayPalCredentials();
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("PayPal authentication failed. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
  }

  cachedPaypalToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 32400) - 60) * 1000,
  };
  return data.access_token;
}

async function paypalFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getPayPalToken();
  const res = await fetch(`${PAYPAL_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { message?: string }).message ||
      (data as { error_description?: string }).error_description ||
      `PayPal API error ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export interface CreatePayPalOrderParams {
  /** Jimvio order UUID — stored as custom_id */
  jimvioOrderId: string;
  amount: number;
  /** ISO 4217 currency code. PayPal supports USD, EUR, GBP, etc. (not RWF) */
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
}

/** Step 1: Create a PayPal order and get the approval URL */
export async function createPayPalOrder(
  params: CreatePayPalOrderParams
): Promise<{ orderId: string; approvalUrl: string }> {
  const currency = (params.currency || "USD").toUpperCase();
  // PayPal does not support RWF — fall back to USD
  const paypalCurrency = ["USD", "EUR", "GBP", "CAD", "AUD"].includes(currency)
    ? currency
    : "USD";

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        custom_id: params.jimvioOrderId,
        description: (params.description || "Jimvio Order").slice(0, 127),
        amount: {
          currency_code: paypalCurrency,
          value: Number(params.amount).toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "Jimvio",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    },
  };

  const order = await paypalFetch<PayPalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const approvalLink = order.links.find((l) => l.rel === "approve");
  if (!approvalLink) throw new Error("PayPal did not return an approval URL.");

  return { orderId: order.id, approvalUrl: approvalLink.href };
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    custom_id?: string;
    payments: {
      captures: Array<{
        id: string;
        status: string;
        amount: { value: string; currency_code: string };
      }>;
    };
  }>;
}

/** Step 2: Capture the PayPal order after buyer approval */
export async function capturePayPalOrder(
  paypalOrderId: string
): Promise<PayPalCaptureResponse> {
  return paypalFetch<PayPalCaptureResponse>(
    `/v2/checkout/orders/${paypalOrderId}/capture`,
    { method: "POST", body: "{}" }
  );
}

/** Verify a PayPal order (for webhook validation) */
export async function getPayPalOrder(
  paypalOrderId: string
): Promise<PayPalOrderResponse & { purchase_units?: unknown[] }> {
  return paypalFetch(`/v2/checkout/orders/${paypalOrderId}`);
}

/**
 * Validate PayPal webhook signature.
 * Requires PAYPAL_WEBHOOK_ID env variable.
 */
export async function validatePayPalWebhook(
  headers: Record<string, string | undefined>,
  rawBody: string
): Promise<boolean> {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) return false;

    const token = await getPayPalToken();
    const res = await fetch(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: headers["paypal-auth-algo"],
          cert_url: headers["paypal-cert-url"],
          transmission_id: headers["paypal-transmission-id"],
          transmission_sig: headers["paypal-transmission-sig"],
          transmission_time: headers["paypal-transmission-time"],
          webhook_id: webhookId,
          webhook_event: JSON.parse(rawBody),
        }),
      }
    );
    const data = (await res.json()) as { verification_status?: string };
    return data.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
