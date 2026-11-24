/**
 * Flutterwave Mobile Money direct-charge adapter.
 * Provider-specific logic stays out of React components.
 */

import { FlutterwaveError, getFlutterwaveApiBaseUrl } from "@/lib/flutterwave";
import { getRates } from "@/lib/currency/rates";
import {
  getMoMoMarketByCountry,
  isMoMoNetworkSupported,
  normalizeMoMoPhone,
  resolveMoMoNetwork,
  type FlutterwaveMoMoMarket,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";



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
  authorizationMode: string;
  rawMessage?: string;
};

export type LocalChargeAmount = {
  amount: number;
  currency: string;
  exchangeRate: number;
  amountUsd: number;
};

export type BuildMoMoChargeInput = {
  market: FlutterwaveMoMoMarket;
  amount: number;
  currency: string;
  email: string;
  fullName: string;
  txRef: string;
  orderId: string;
  phoneNumber: string;
  network: string | null;
  redirectUrl: string;
};

/**
 * Market-specific Flutterwave direct-charge body builder.
 * Only includes fields the selected charge type actually accepts.
 */
export function buildFlutterwaveMobileMoneyCharge(
  input: BuildMoMoChargeInput,
): Record<string, unknown> {
  const { market } = input;
  const amount =
    market.amountDecimals === 0
      ? Math.trunc(input.amount)
      : Math.round(input.amount * 100) / 100;

  const payload: Record<string, unknown> = {
    tx_ref: input.txRef,
    amount,
    currency: input.currency.toUpperCase(),
    email: input.email,
    fullname: input.fullName || "Customer",
    phone_number: input.phoneNumber,
    meta: {
      order_id: input.orderId,
      jimvio_method: "mobile_money",
      country: market.countryCode,
      network: input.network ?? "",
    },
  };

  if (market.includeOrderIdInCharge) {
    // Rwanda OpenAPI requires merchant `order_id` (unique MoMo charge ref).
    payload.order_id = input.txRef;
  }
  if (market.includeNetworkInCharge && input.network) {
    payload.network = input.network;
  }
  if (market.requiresCountryInPayload) {
    payload.country = market.countryCode;
  }
  if (market.includeRedirectUrlInCharge && input.redirectUrl) {
    payload.redirect_url = input.redirectUrl;
  }

  return payload;
}

function extractAuthorizationRedirect(data: {
  meta?: {
    authorization?: {
      redirect?: string;
      redirect_url?: string;
      mode?: string;
    };
  };
}): string | null {
  const auth = data.meta?.authorization;
  const candidates = [auth?.redirect, auth?.redirect_url];
  for (const url of candidates) {
    if (typeof url === "string" && url.startsWith("https://")) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        // Only allow Flutterwave / Rave authorization hosts.
        if (
          host.endsWith("flutterwave.com") ||
          host.endsWith("flutterwave.cloud") ||
          host.endsWith("ravepay.co") ||
          host.includes("ravemodal") ||
          host.endsWith("herokuapp.com")
        ) {
          return url;
        }
      } catch {
        // ignore invalid URL
      }
    }
  }
  return null;
}

function mapProviderInitError(message: string, httpStatus: number): FlutterwaveError {
  const msg = message.slice(0, 200);
  const lower = msg.toLowerCase();

  if (
    /not enabled|not available|not supported|disabled|unauthorized payment|merchant/i.test(
      lower,
    )
  ) {
    return new FlutterwaveError(
      "Mobile Money is currently unavailable for this country.",
      400,
      { providerMessage: msg, httpStatus },
    );
  }
  if (/currency/i.test(lower)) {
    return new FlutterwaveError(
      "Mobile Money is unavailable in this currency.",
      400,
      { providerMessage: msg, httpStatus },
    );
  }
  if (/phone/i.test(lower)) {
    return new FlutterwaveError(
      "Please enter a valid Mobile Money number.",
      400,
      { providerMessage: msg, httpStatus },
    );
  }
  if (/network|provider/i.test(lower)) {
    return new FlutterwaveError(
      "This Mobile Money provider is currently unavailable.",
      400,
      { providerMessage: msg, httpStatus },
    );
  }

  return new FlutterwaveError(
    "We couldn't start your Mobile Money payment. Please check your phone number and provider.",
    httpStatus >= 400 && httpStatus < 600 ? httpStatus : 502,
    { providerMessage: msg, httpStatus },
  );
}

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

  let rates: Record<string, number>;
  try {
    rates = await getRates();
  } catch {
    throw new FlutterwaveError(
      "Mobile Money exchange-rate conversion is temporarily unavailable.",
      502,
    );
  }

  const rate = rates[currency];
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new FlutterwaveError(
      "Mobile Money exchange-rate conversion is temporarily unavailable.",
      502,
    );
  }

  const local = roundLocal(amountUsd * rate, market.amountDecimals);
  if (!Number.isFinite(local) || local <= 0) {
    throw new FlutterwaveError(
      "Mobile Money exchange-rate conversion is temporarily unavailable.",
      502,
    );
  }

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

  if (!input.email?.trim()) {
    throw new FlutterwaveError(
      "Please add a valid email address before paying with Mobile Money.",
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

  const payload = buildFlutterwaveMobileMoneyCharge({
    market,
    amount: chargeAmount.amount,
    currency: chargeAmount.currency,
    email: input.email.trim(),
    fullName: input.fullName,
    txRef: input.txRef,
    orderId: input.orderId,
    phoneNumber: phone.e164Digits,
    network,
    redirectUrl: input.redirectUrl,
  });

  console.info("[flutterwave-momo] initiating", {
    provider: "flutterwave",
    method: "mobile_money",
    orderId: input.orderId,
    txRef: input.txRef,
    country: market.countryCode,
    currency: chargeAmount.currency,
    amount: chargeAmount.amount,
    network: network ?? null,
    chargeType: market.chargeType,
    phone: phone.masked,
    payloadKeys: Object.keys(payload).sort(),
  });

  const url = `${getFlutterwaveApiBaseUrl()}/charges?type=${encodeURIComponent(market.chargeType)}`;
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
        redirect_url?: string;
        mode?: string;
      };
    };
  };

  if (!res.ok || data.status !== "success") {
    const providerMessage = (data.message || "Charge failed").slice(0, 200);
    console.error("[flutterwave-momo] charge_failed", {
      provider: "flutterwave",
      method: "mobile_money",
      orderId: input.orderId,
      txRef: input.txRef,
      country: market.countryCode,
      currency: chargeAmount.currency,
      chargeType: market.chargeType,
      httpStatus: res.status,
      providerMessage,
    });
    throw mapProviderInitError(providerMessage, res.status);
  }

  const flwStatus = String(data.data?.status ?? "pending").toLowerCase();
  const redirect = extractAuthorizationRedirect(data);

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
    authorizationMode: market.authorizationMode,
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
