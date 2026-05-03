/**
 * Chooses a payment integration for checkout (server-only).
 * Does not replace existing /api/payments/* routes — wire this when the multi-gateway flow is ready.
 */
import { randomUUID } from "crypto";
import type { CurrencyCode } from "@/lib/currency/config";
import { initiateAfriPayPayment } from "./afripay";
import { createNowPaymentsInvoice } from "./nowpayments";
import { initiatePesaPalPayment } from "./pesapal";

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
    phoneNumber = "",
    mobileNetwork = "",
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

  // 3. RWF + mobile money → AfriPay
  if (userCurrency === "RWF" && paymentMethod === "mobile_money") {
    logRoute("afripay", userCurrency, paymentMethod);
    const net = (mobileNetwork || "MTN").toUpperCase();
    let network: "MTN" | "BK" | "MPESA" = "MTN";
    if (net.includes("MPESA")) network = "MPESA";
    else if (net.includes("BK")) network = "BK";
    const af = await initiateAfriPayPayment({
      transactionId: orderId,
      amountUSD,
      currency: "RWF",
      phone: phoneNumber,
      network,
      description,
      callbackUrl: `${b}/api/webhooks/afripay`,
    });
    if (af.error) {
      return fail("afripay", af.error);
    }
    return { gateway: "afripay", status: af.status, transactionId: af.transactionId };
  }



  // 6. KES / UGX / TZS → PesaPal
  if (userCurrency === "KES" || userCurrency === "UGX" || userCurrency === "TZS") {
    logRoute("pesapal", userCurrency, paymentMethod);
    if (!customerEmail.trim()) {
      return fail("pesapal", "customerEmail is required for PesaPal");
    }
    const ps = await initiatePesaPalPayment({
      orderId,
      amountUSD,
      currency: userCurrency,
      customerEmail,
      customerPhone: phoneNumber || "000000000",
      description,
      callbackUrl: `${b}/checkout/success?orderId=${encodeURIComponent(orderId)}`,
      cancellationUrl: `${b}/checkout/cancel`,
    });
    if (ps.error || !ps.redirectUrl) {
      return fail("pesapal", ps.error ?? "PesaPal failed");
    }
    return {
      gateway: "pesapal",
      orderTrackingId: ps.orderTrackingId,
      redirectUrl: ps.redirectUrl,
      status: "CREATED",
    };
  }

  // 7. Default → NowPayments
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
