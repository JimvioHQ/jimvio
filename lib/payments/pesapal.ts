/**
 * PesaPal API 3.0 — server-only.
 * Docs: https://developer.pesapal.com
 */
import type { CurrencyCode } from "@/lib/currency/config";
import { convertFromUSD } from "@/lib/currency/rates";

async function getPesaPalToken(): Promise<string> {
  const baseUrl =
    process.env.PESAPAL_SANDBOX === "true"
      ? "https://cybqa.pesapal.com/pesapalv3"
      : "https://pay.pesapal.com/v3";

  const consumer_key = process.env.PESAPAL_CONSUMER_KEY?.trim();
  const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET?.trim();
  if (!consumer_key || !consumer_secret) {
    throw new Error("PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET are required");
  }

  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ consumer_key, consumer_secret }),
  });

  const data = (await res.json()) as { token?: string; error?: { message?: string } };
  if (!data.token) {
    throw new Error(data.error?.message || `PesaPal RequestToken failed (${res.status})`);
  }
  return data.token;
}

export async function initiatePesaPalPayment(params: {
  orderId: string;
  amountUSD: number;
  currency: CurrencyCode;
  customerEmail: string;
  customerPhone: string;
  description: string;
  callbackUrl: string;
  cancellationUrl: string;
}): Promise<{ orderTrackingId: string; redirectUrl: string; error?: string }> {
  const baseUrl =
    process.env.PESAPAL_SANDBOX === "true"
      ? "https://cybqa.pesapal.com/pesapalv3"
      : "https://pay.pesapal.com/v3";

  try {
    if (!["KES", "UGX", "TZS"].includes(params.currency)) {
      return {
        orderTrackingId: "",
        redirectUrl: "",
        error: "initiatePesaPalPayment supports KES, UGX, and TZS only",
      };
    }

    const token = await getPesaPalToken();
    const amount = await convertFromUSD(params.amountUSD, params.currency);
    const currency = params.currency.toUpperCase();
    const rounded =
      currency === "RWF" || currency === "UGX" ? Math.max(1, Math.round(amount)) : Math.round(amount * 100) / 100;

    const countryByCurrency: Record<string, string> = { KES: "KE", UGX: "UG", TZS: "TZ" };
    const country_code = countryByCurrency[currency] ?? "KE";

    const body = {
      id: params.orderId,
      currency,
      amount: rounded,
      description: params.description.slice(0, 100),
      callback_url: params.callbackUrl,
      cancellation_url: params.cancellationUrl,
      redirect_mode: "PARENT_WINDOW",
      // TODO: Production PesaPal orders may require a registered IPN id (notification_id) — see lib/pesapal.ts
      billing_address: {
        email_address: params.customerEmail,
        phone_number: params.customerPhone.replace(/\s+/g, ""),
        line_1: "—",
        country_code,
      },
    };

    const res = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      order_tracking_id?: string;
      redirect_url?: string;
      error?: { message?: string; code?: string };
    };

    if (!res.ok || !data.redirect_url) {
      return {
        orderTrackingId: data.order_tracking_id ?? "",
        redirectUrl: "",
        error: data.error?.message || JSON.stringify(data).slice(0, 400),
      };
    }

    return {
      orderTrackingId: data.order_tracking_id ?? "",
      redirectUrl: data.redirect_url,
    };
  } catch (e) {
    return {
      orderTrackingId: "",
      redirectUrl: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
