/**
 * PawaPay deposit initiation (server-only).
 * Uses Merchant API v2 POST /v2/deposits — see https://docs.pawapay.io/
 * Amount is sent as a digit string per PawaPay rules (no currency symbols).
 */
import type { CurrencyCode } from "@/lib/currency/config";
import { convertFromUSD } from "@/lib/currency/rates";

function formatPawaPayAmountString(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid amount");
  if (Number.isInteger(amount)) return String(amount);
  const s = amount.toFixed(4).replace(/\.?0+$/, "");
  return s;
}

export async function initiatePawaPayDeposit(params: {
  depositId: string;
  amountUSD: number;
  currency: CurrencyCode;
  correspondent: string;
  msisdn: string;
  description: string;
  callbackUrl: string;
}): Promise<{ depositId: string; status: string; error?: string }> {
  const token = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!token) {
    return { depositId: params.depositId, status: "FAILED", error: "PAWAPAY_API_TOKEN is not set" };
  }

  const baseUrl =
    process.env.PAWAPAY_SANDBOX === "true" ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

  try {
    const localAmount = await convertFromUSD(params.amountUSD, params.currency);
    const amountStr = formatPawaPayAmountString(localAmount);

    const url = `${baseUrl.replace(/\/$/, "")}/v2/deposits`;
    const body = {
      depositId: params.depositId,
      amount: amountStr,
      currency: params.currency,
      payer: {
        type: "MMO" as const,
        accountDetails: {
          phoneNumber: params.msisdn.replace(/\D/g, ""),
          provider: params.correspondent,
        },
      },
      customerMessage: params.description.slice(0, 140),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: { status?: string; depositId?: string; failureReason?: { failureMessage?: string } };
    try {
      data = text ? (JSON.parse(text) as typeof data) : {};
    } catch {
      return { depositId: params.depositId, status: "FAILED", error: text.slice(0, 300) };
    }

    if (!res.ok) {
      const msg = data.failureReason?.failureMessage || text.slice(0, 400);
      return { depositId: params.depositId, status: "FAILED", error: msg };
    }

    const st = data.status ?? "ACCEPTED";
    const id = data.depositId ?? params.depositId;
    return { depositId: id, status: st };
  } catch (e) {
    return {
      depositId: params.depositId,
      status: "FAILED",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
