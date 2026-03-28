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
  const apiKey = process.env.AFRIPAY_API_KEY?.trim();
  if (!apiKey) {
    return { transactionId: params.transactionId, status: "FAILED", error: "AFRIPAY_API_KEY is not set" };
  }

  const baseUrl =
    process.env.AFRIPAY_SANDBOX === "true"
      ? "https://sandbox.afripay.africa"
      : "https://www.afripay.africa";

  try {
    const amount = await convertFromUSD(params.amountUSD, "RWF");

    // TODO: Replace with exact AfriPay endpoint once confirmed from their docs
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/payment/initiate`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
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
  const apiKey = process.env.AFRIPAY_API_KEY?.trim();
  if (!apiKey) return { status: "FAILED", error: "AFRIPAY_API_KEY is not set" };

  const baseUrl =
    process.env.AFRIPAY_SANDBOX === "true"
      ? "https://sandbox.afripay.africa"
      : "https://www.afripay.africa";

  try {
    // TODO: Verify endpoint from AfriPay docs when available
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/payment/status/${transactionId}`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
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
