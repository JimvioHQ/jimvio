/**
 * Chooses a payment integration for checkout (server-only).
 * Does not replace existing /api/payments/* routes — wire this when the multi-gateway flow is ready.
 * PesaPal, PayPal, AfriPay, and PawaPay are retired and must never be selected here.
 * Mobile money is handled via Flutterwave (see /api/payments/mobile-money).
 */
import type { CurrencyCode } from "@/lib/currency/config";
import { createNowPaymentsInvoice } from "./nowpayments";

export type RoutePaymentParams = {
  orderId: string;
  amountUSD: number;
  userCurrency: CurrencyCode;
  paymentMethod: "mobile_money" | "card" | "crypto";
  userCountry: string;
  phoneNumber?: string;
  mobileNetwork?: string;
  customerEmail?: string;
  description: string;
  callbackBaseUrl: string;
};

export type RoutePaymentResult = {
  gateway: string;
  redirectUrl?: string;
  depositId?: string;
  orderTrackingId?: string;
  transactionId?: string;
  status: string;
  error?: string;
};

function base(callbackBaseUrl: string): string {
  return callbackBaseUrl.replace(/\/$/, "");
}

function logRoute(gateway: string, userCurrency: CurrencyCode, paymentMethod: RoutePaymentParams["paymentMethod"]) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[PaymentRouter] Routing to: ${gateway} | Currency: ${userCurrency} | Method: ${paymentMethod}`);
  }
}

export async function routePayment(params: RoutePaymentParams): Promise<RoutePaymentResult> {
  const {
    orderId,
    amountUSD,
    userCurrency,
    paymentMethod,
    description,
    callbackBaseUrl,
    customerEmail = "",
  } = params;

  const b = base(callbackBaseUrl);

  const fail = (gateway: string, err: string): RoutePaymentResult => ({
    gateway,
    status: "FAILED",
    error: err,
  });

  // 1. Crypto → NowPayments
  if (paymentMethod === "crypto") {
    logRoute("nowpayments", userCurrency, paymentMethod);
    const inv = await createNowPaymentsInvoice({
      orderId,
      amountUSD,
      customerEmail: customerEmail || undefined,
      description,
      successUrl: `${b}/checkout/success?orderId=${encodeURIComponent(orderId)}`,
      cancelUrl: `${b}/checkout/cancel`,
      callbackUrl: `${b}/api/webhooks/nowpayments`,
    });
    if (inv.error || !inv.invoiceUrl) {
      return fail("nowpayments", inv.error ?? "invoice failed");
    }
    return {
      gateway: "nowpayments",
      redirectUrl: inv.invoiceUrl,
      status: "CREATED",
    };
  }

  // 2. USD → NowPayments
  if (userCurrency === "USD") {
    logRoute("nowpayments", userCurrency, paymentMethod);
    const inv = await createNowPaymentsInvoice({
      orderId,
      amountUSD,
      customerEmail: customerEmail || undefined,
      description,
      successUrl: `${b}/checkout/success?orderId=${encodeURIComponent(orderId)}`,
      cancelUrl: `${b}/checkout/cancel`,
      callbackUrl: `${b}/api/webhooks/nowpayments`,
    });
    if (inv.error || !inv.invoiceUrl) {
      return fail("nowpayments", inv.error ?? "invoice failed");
    }
    return {
      gateway: "nowpayments",
      redirectUrl: inv.invoiceUrl,
      status: "CREATED",
    };
  }

  // Default → NowPayments (AfriPay/PawaPay/PesaPal retired; mobile money via Flutterwave routes)
  logRoute("nowpayments", userCurrency, paymentMethod);
  const inv = await createNowPaymentsInvoice({
    orderId,
    amountUSD,
    customerEmail: customerEmail || undefined,
    description,
    successUrl: `${b}/checkout/success?orderId=${encodeURIComponent(orderId)}`,
    cancelUrl: `${b}/checkout/cancel`,
    callbackUrl: `${b}/api/webhooks/nowpayments`,
  });
  if (inv.error || !inv.invoiceUrl) {
    return fail("nowpayments", inv.error ?? "invoice failed");
  }
  return {
    gateway: "nowpayments",
    redirectUrl: inv.invoiceUrl,
    status: "CREATED",
  };
}
