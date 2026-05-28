// lib/payments/initiate-binance-pay.ts
// Runs on the frontend (Vercel — www.jimvio.com)
// Calls the Binance Pay backend on Render (payments.jimvio.com)

const BINANCE_PAY_ENDPOINT =
  "https://payments.jimvio.com/api/payments/binancepay/initiate";

export interface BinancePayResult {
  success: true;
  redirectUrl: string;
  qrContent?: string;
  prepayId: string;
  expiresAt: string;
  payAmount: number;
  payCurrency: string;
  exchangeRate: number;
  reused?: boolean;
}

export interface BinancePayError {
  success: false;
  error: string;
  currentStatus?: string;
  reason?: string;
}

export type BinancePayResponse = BinancePayResult | BinancePayError;

/**
 * Initiates a Binance Pay order for the given orderId.
 *
 * KEY FIX: credentials: "include"
 * --------------------------------
 * This fetch is cross-origin (www.jimvio.com → payments.jimvio.com).
 * Supabase stores the auth session in cookies. Without credentials:"include",
 * the browser strips all cookies from the cross-origin request, so the
 * Render API receives an unauthenticated request and returns 401.
 *
 * credentials:"include" requires the server to respond with:
 *   Access-Control-Allow-Origin: https://www.jimvio.com  (exact, not *)
 *   Access-Control-Allow-Credentials: true
 *
 * Both are now set in the Render route handler and next.config.js.
 */
export async function initiateBinancePay(
  orderId: string
): Promise<BinancePayResponse> {
  let response: Response;

  try {
    response = await fetch(BINANCE_PAY_ENDPOINT, {
      method: "POST",
      // FIX: credentials:"include" sends Supabase auth cookies cross-origin.
      // Without this, the server sees an unauthenticated request.
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });
  } catch (networkErr) {
    // fetch() itself threw — this is a network-level failure:
    // - DNS resolution failed
    // - CORS preflight was blocked (browser throws TypeError, not HTTP error)
    // - SSL handshake failed
    // - Request timed out before any response
    console.error("[initiateBinancePay] network error:", networkErr);
    return {
      success: false,
      error:
        "Could not reach the payment server. Please check your connection and try again.",
    };
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    console.error(
      "[initiateBinancePay] non-JSON response, status:",
      response.status
    );
    return {
      success: false,
      error: `Payment server returned an unexpected response (HTTP ${response.status}). Please try again.`,
    };
  }

  if (!response.ok) {
    const errData = data as Record<string, unknown>;
    const message =
      typeof errData?.error === "string"
        ? errData.error
        : `Payment request failed (HTTP ${response.status})`;

    console.error("[initiateBinancePay] server error:", {
      status: response.status,
      data,
    });

    return {
      success: false,
      error: message,
      currentStatus:
        typeof errData?.currentStatus === "string"
          ? errData.currentStatus
          : undefined,
      reason:
        typeof errData?.reason === "string" ? errData.reason : undefined,
    };
  }

  return data as BinancePayResult;
}
