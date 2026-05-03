/**
 * AfriPay — server-only scaffold.
 * TODO: Verify sandbox base URL and payment/initiate payload with AfriPay official docs before production.
 */
import { convertFromUSD } from "@/lib/currency/rates";

export async function initiateAfriPayPayment(params: {
  transactionId: string;
  amountUSD: number;
  currency: "RWF";
  phone: string;
  network: "MTN" | "BK" | "MPESA";
  description: string;
  callbackUrl: string;
}): Promise<{ transactionId: string; status: string; error?: string }> {
  const appId = process.env.AFRIPAY_APP_ID?.trim();
  const appSecret = process.env.AFRIPAY_APP_SECRET?.trim();
  
  if (!appId || !appSecret) {
    return { transactionId: params.transactionId, status: "FAILED", error: "AFRIPAY_APP_ID or AFRIPAY_APP_SECRET is not set" };
  }

  const baseUrl =
    process.env.AFRIPAY_SANDBOX === "true"
      ? "https://sandbox.afripay.io/api"
      : "https://afripay.io/api";

  try {
    const amount = await convertFromUSD(params.amountUSD, "RWF");
    const url = `${baseUrl.replace(/\/$/, "")}/payment/initiate`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret,
        transactionId: params.transactionId,
        amount: Math.round(amount),
        currency: "RWF",
        phone: params.phone.replace(/\D/g, ""),
        network: params.network,
        description: params.description,
        callbackUrl: params.callbackUrl,
      }),
    });

    const text = await res.text();
    let data: { status?: string; transactionId?: string };
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      return { transactionId: params.transactionId, status: "FAILED", error: text.slice(0, 300) };
    }

    if (!res.ok) {
      return { transactionId: params.transactionId, status: "FAILED", error: text.slice(0, 400) };
    }

    return {
      transactionId: data.transactionId ?? params.transactionId,
      status: data.status ?? "PENDING",
    };
  } catch (e) {
    return {
      transactionId: params.transactionId,
      status: "FAILED",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function checkAfriPayStatus(transactionId: string): Promise<{ status: string; error?: string }> {
  const appId = process.env.AFRIPAY_APP_ID?.trim();
  const appSecret = process.env.AFRIPAY_APP_SECRET?.trim();
  
  if (!appId || !appSecret) return { status: "FAILED", error: "AFRIPAY_APP_ID or AFRIPAY_APP_SECRET is not set" };

  const baseUrl =
    process.env.AFRIPAY_SANDBOX === "true"
      ? "https://sandbox.afripay.io/api"
      : "https://afripay.io/api";

  try {
    const url = `${baseUrl.replace(/\/$/, "")}/payment/status/${transactionId}`;

    const res = await fetch(url, {
      method: "POST", // Status calls typically POST app credentials if basic auth isn't used
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
         app_id: appId,
         app_secret: appSecret
      })
    });

    const text = await res.text();
    let data: { status?: string };
    try {
       data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
       return { status: "FAILED", error: text.slice(0, 300) };
    }

    if (!res.ok) {
       return { status: "FAILED", error: text.slice(0, 400) };
    }

    return { status: data.status ?? "PENDING" };
  } catch (e) {
    return { status: "FAILED", error: e instanceof Error ? e.message : String(e) };
  }
}
