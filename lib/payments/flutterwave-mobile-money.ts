/**
 * Flutterwave Mobile Money direct-charge adapter.
 * Provider-specific logic stays out of React components.
 */

import { FlutterwaveError } from "@/lib/flutterwave";
import { getRates } from "@/lib/currency/rates";
import {
  getMoMoMarketByCountry,
  isMoMoNetworkSupported,
  normalizeMoMoPhone,
  resolveMoMoNetwork,
  type FlutterwaveMoMoMarket,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";

function getBaseUrl(): string {
  return (process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3").trim();
}

function getSecretKey(): string {
  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new FlutterwaveError("FLW_SECRET_KEY is not configured", 500);
  return key.trim().replace(/^["']|["']$/g, "");
}

export type CreateMobileMoneyPaymentInput = {
  country: string;
  network?: string | null;
  phone: string;
  amountUsd: number;
  orderId: string;
  txRef: string;
  email: string;
  fullName: string;
  redirectUrl: string;
  /** Optional precomputed local amount (server-trusted only). */
  localAmount?: number;
  localCurrency?: string;
  exchangeRate?: number | null;
};

export type MobileMoneyChargeResult = {
  status: "pending" | "successful" | "failed";
  flwTransactionId: number | null;
  flwRef: string | null;
  redirectUrl: string | null;
  amount: number;
  currency: string;
  exchangeRate: number;
  network: string | null;
  country: string;
  phoneMasked: string;
  chargeType: string;
  rawMessage?: string;
};

export type LocalChargeAmount = {
  amount: number;
  currency: string;
  exchangeRate: number;
  amountUsd: number;
};

function roundLocal(amount: number, decimals: 0 | 2): number {
  if (decimals === 0) return Math.max(1, Math.round(amount));
  return Math.round(Math.max(0.01, amount) * 100) / 100;
}

/**
 * Convert platform USD order total → local MoMo charge currency using
 * existing Jimvio FX rates (no second FX system).
 */
export async function resolveMoMoChargeAmount(
  amountUsd: number,
  market: FlutterwaveMoMoMarket,
): Promise<LocalChargeAmount> {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    throw new FlutterwaveError("Invalid payment amount", 400);
  }

  const currency = market.currency.toUpperCase();
  if (currency === "USD") {
    return {
      amount: roundLocal(amountUsd, 2),
      currency: "USD",
      exchangeRate: 1,
      amountUsd: roundLocal(amountUsd, 2),
    };
  }

  const rates = await getRates();
  const rate = rates[currency];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new FlutterwaveError(
      `Exchange rate unavailable for ${currency}`,
      502,
    );
  }

  const local = roundLocal(amountUsd * rate, market.amountDecimals);
  return {
    amount: local,
    currency,
    exchangeRate: rate,
    amountUsd: Math.round(amountUsd * 100) / 100,
  };
}

export async function createMobileMoneyPayment(
  input: CreateMobileMoneyPaymentInput,
): Promise<MobileMoneyChargeResult> {
  const market = getMoMoMarketByCountry(input.country);
  if (!market) {
    throw new FlutterwaveError(
      "Mobile Money is not available in this country.",
      400,
    );
  }

  if (!isMoMoNetworkSupported(market, input.network)) {
    throw new FlutterwaveError(
      "This network is currently unavailable.",
      400,
    );
  }

  const network = resolveMoMoNetwork(market, input.network);
  const phone = normalizeMoMoPhone(market, input.phone);
  if (!phone.ok) {
    throw new FlutterwaveError(phone.error, 400);
  }

  const chargeAmount =
    input.localAmount != null &&
    input.localCurrency?.toUpperCase() === market.currency &&
    Number.isFinite(input.localAmount)
      ? {
          amount: input.localAmount,
          currency: market.currency,
          exchangeRate: input.exchangeRate ?? 0,
          amountUsd: input.amountUsd,
        }
      : await resolveMoMoChargeAmount(input.amountUsd, market);

  const payload: Record<string, unknown> = {
    tx_ref: input.txRef,
    amount: chargeAmount.amount,
    currency: chargeAmount.currency,
    email: input.email,
    fullname: input.fullName || "Customer",
    phone_number: phone.e164Digits,
    redirect_url: input.redirectUrl,
    meta: {
      order_id: input.orderId,
      jimvio_method: "mobile_money",
      country: market.countryCode,
      network: network ?? "",
    },
  };

  if (market.requiresNetwork && network) {
    payload.network = network;
  }
  if (market.requiresCountryInPayload) {
    payload.country = market.countryCode;
  }

  console.info("[flutterwave-momo] initiating", {
    orderId: input.orderId,
    txRef: input.txRef,
    country: market.countryCode,
    currency: chargeAmount.currency,
    amount: chargeAmount.amount,
    network: network ?? null,
    chargeType: market.chargeType,
    phone: phone.masked,
  });

  const url = `${getBaseUrl()}/charges?type=${encodeURIComponent(market.chargeType)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: {
      id?: number;
      flw_ref?: string;
      status?: string;
      amount?: number;
      currency?: string;
    };
    meta?: {
      authorization?: {
        redirect?: string;
        mode?: string;
      };
    };
  };

  if (!res.ok || data.status !== "success") {
    const msg = (data.message || "Charge failed").slice(0, 200);
    console.error("[flutterwave-momo] charge_failed", {
      orderId: input.orderId,
      txRef: input.txRef,
      country: market.countryCode,
      httpStatus: res.status,
      message: msg,
    });
    throw new FlutterwaveError(
      "We couldn't initiate the Mobile Money payment.",
      res.status >= 400 && res.status < 600 ? res.status : 502,
      data,
    );
  }

  const flwStatus = String(data.data?.status ?? "pending").toLowerCase();
  const redirect =
    data.meta?.authorization?.redirect &&
    data.meta.authorization.redirect.startsWith("https://")
      ? data.meta.authorization.redirect
      : null;

  let status: MobileMoneyChargeResult["status"] = "pending";
  if (flwStatus === "successful" || flwStatus === "succeeded") {
    status = "successful";
  } else if (flwStatus === "failed") {
    status = "failed";
  }

  return {
    status,
    flwTransactionId: data.data?.id ?? null,
    flwRef: data.data?.flw_ref ?? null,
    redirectUrl: redirect,
    amount: chargeAmount.amount,
    currency: chargeAmount.currency,
    exchangeRate: chargeAmount.exchangeRate,
    network,
    country: market.countryCode,
    phoneMasked: phone.masked,
    chargeType: market.chargeType,
    rawMessage: data.message,
  };
}

/** Quote local payable amount for UI (server-side). */
export async function quoteMoMoAmount(
  countryCode: string,
  amountUsd: number,
): Promise<LocalChargeAmount | null> {
  const market = getMoMoMarketByCountry(countryCode);
  if (!market) return null;
  return resolveMoMoChargeAmount(amountUsd, market);
}
