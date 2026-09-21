import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/require-session";
import { getSupabaseSecretKey } from "@/lib/supabase/service-role";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { buildPaymentSnapshot } from "@/lib/payments/order-payment-utils";
import { resolveTrustedRequestOrigin } from "@/lib/payments/customer-return-origin";
import { PLATFORM_CURRENCY } from "@/lib/currency/platform";
import {
  getMoMoMarketByCountry,
  isMoMoNetworkSupported,
} from "@/lib/payments/flutterwave-mobile-money-capabilities";
import { createMobileMoneyPayment } from "@/lib/payments/flutterwave-mobile-money";
import { FlutterwaveError } from "@/lib/flutterwave";
import { orderTotalsForUsdGateway } from "@/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const TERMINAL_STATUSES = new Set(["paid", "completed", "refunded"]);

const RequestSchema = z.object({
  orderId: z.string().uuid("orderId must be a valid UUID"),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  network: z.string().trim().max(40).optional().nullable(),
  phone: z.string().trim().min(7).max(24),
});

type ApiError =
  | { code: "VALIDATION_ERROR"; details?: unknown; message?: string }
  | { code: "ORDER_NOT_FOUND" }
  | { code: "ORDER_ALREADY_PAID"; currentStatus: string }
  | { code: "BUYER_EMAIL_MISSING" }
  | { code: "UNSUPPORTED_COUNTRY" }
  | { code: "UNSUPPORTED_NETWORK" }
  | { code: "INVALID_PHONE"; message: string }
  | { code: "PAYMENT_INIT_FAILED"; message: string }
  | { code: "INTERNAL_ERROR"; reason: string };

function apiError(status: number, error: ApiError) {
  return NextResponse.json({ error }, { status });
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getSupabaseSecretKey();
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function extractProfile(
  raw: ProfileRow | ProfileRow[] | null,
): ProfileRow | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function resolveOrderAmountUsd(
  totalAmount: number,
  orderCurrency: string,
): number {
  const converted = orderTotalsForUsdGateway(totalAmount, orderCurrency);
  return converted.amount;
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(400, {
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
        message: "Invalid Mobile Money request.",
      });
    }
    body = parsed.data;
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      message: "Invalid Mobile Money request.",
    });
  }

  const { orderId, country, network, phone } = body;

  try {
    const session = await requireSessionUser();
    if ("error" in session) return session.error;

    const market = getMoMoMarketByCountry(country);
    if (!market) {
      return apiError(400, { code: "UNSUPPORTED_COUNTRY" });
    }
    if (!isMoMoNetworkSupported(market, network)) {
      return apiError(400, { code: "UNSUPPORTED_NETWORK" });
    }

    const supabase = getSupabase();

    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        `id, order_number, buyer_id, total_amount, currency, payment_status, shipping_address, billing_address, metadata, profiles (full_name, email, phone)`,
      )
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .single();

    if (fetchError || !order) {
      return apiError(404, { code: "ORDER_NOT_FOUND" });
    }

    if (TERMINAL_STATUSES.has(order.payment_status)) {
      return apiError(400, {
        code: "ORDER_ALREADY_PAID",
        currentStatus: order.payment_status,
      });
    }

    const profile = extractProfile(
      order.profiles as ProfileRow | ProfileRow[] | null,
    );
    if (!profile?.email) {
      return apiError(400, { code: "BUYER_EMAIL_MISSING" });
    }

    const orderCurrency = (order.currency ?? PLATFORM_CURRENCY).toUpperCase();
    const amountUsd = resolveOrderAmountUsd(
      Number(order.total_amount),
      orderCurrency,
    );

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return apiError(400, {
        code: "VALIDATION_ERROR",
        message: "Order total is invalid.",
      });
    }

    const origin =
      resolveTrustedRequestOrigin(req) ?? "https://www.jimvio.com";
    const txRef = generateTxRef("JMM");
    const redirectUrl = `${origin}/api/payments/flutterwave/callback?order=${orderId}&tx_ref=${encodeURIComponent(txRef)}`;

    let charge;
    try {
      charge = await createMobileMoneyPayment({
        country: market.countryCode,
        network: network ?? null,
        phone,
        amountUsd,
        orderId,
        txRef,
        email: profile.email,
        fullName: profile.full_name ?? "Customer",
        redirectUrl,
      });
    } catch (err) {
      if (err instanceof FlutterwaveError && err.statusCode === 400) {
        const msg = err.message;
        if (/phone|number/i.test(msg)) {
          return apiError(400, { code: "INVALID_PHONE", message: msg });
        }
        if (/network/i.test(msg)) {
          return apiError(400, { code: "UNSUPPORTED_NETWORK" });
        }
        if (/country/i.test(msg)) {
          return apiError(400, { code: "UNSUPPORTED_COUNTRY" });
        }
        return apiError(400, {
          code: "PAYMENT_INIT_FAILED",
          message: msg,
        });
      }
      console.error("[mobile-money/initiate] charge error", {
        orderId,
        country: market.countryCode,
        message: err instanceof Error ? err.message.slice(0, 160) : String(err),
      });
      return apiError(502, {
        code: "PAYMENT_INIT_FAILED",
        message: "We couldn't initiate the Mobile Money payment.",
      });
    }

    const paymentSnapshot = buildPaymentSnapshot({
      orderTotal: Number(order.total_amount),
      orderCurrency,
      paymentAmount: charge.amount,
      paymentCurrency: charge.currency,
      exchangeRate: charge.exchangeRate,
    });

    const existingMetadata =
      order.metadata &&
      typeof order.metadata === "object" &&
      !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, unknown>)
        : {};

    await supabase
      .from("orders")
      .update({
        metadata: {
          ...existingMetadata,
          payment_snapshot: paymentSnapshot,
          mobile_money: {
            country: charge.country,
            network: charge.network,
            currency: charge.currency,
            amount: charge.amount,
            charge_type: charge.chargeType,
          },
        },
        payment_provider: "flutterwave",
        flutterwave_tx_ref: txRef,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("buyer_id", session.user.id);

    // Expire prior pending flutterwave attempts for this order
    await supabase
      .from("transactions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("provider", "flutterwave")
      .eq("status", "pending");

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: order.buyer_id,
      order_id: orderId,
      type: "payment",
      direction: "credit",
      amount: charge.amount,
      currency: charge.currency,
      amount_usd: amountUsd,
      exchange_rate: charge.exchangeRate,
      status: charge.status === "failed" ? "failed" : "pending",
      provider: "flutterwave",
      provider_transaction_id: txRef,
      provider_reference: charge.flwRef,
      description: `Mobile Money · Order ${order.order_number ?? orderId.slice(0, 8)}`,
      metadata: {
        method: "mobile_money",
        country: charge.country,
        network: charge.network,
        charge_type: charge.chargeType,
        phone_masked: charge.phoneMasked,
        flw_transaction_id: charge.flwTransactionId,
        initiated_at: new Date().toISOString(),
        original_currency: orderCurrency,
        original_amount: Number(order.total_amount),
        payment_snapshot: paymentSnapshot,
        status_hint:
          charge.status === "pending"
            ? "awaiting_customer"
            : charge.status,
      },
    });

    if (txError && txError.code !== "23505") {
      console.error("[mobile-money/initiate] tx insert failed", {
        orderId,
        reason: txError.message.slice(0, 160),
      });
      return apiError(500, {
        code: "INTERNAL_ERROR",
        reason: "Could not record payment attempt.",
      });
    }

    if (charge.flwTransactionId) {
      await supabase
        .from("orders")
        .update({
          flutterwave_transaction_id: String(charge.flwTransactionId),
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    console.info("[mobile-money/initiate] created", {
      orderId,
      txRef,
      country: charge.country,
      currency: charge.currency,
      amount: charge.amount,
      network: charge.network,
      flwId: charge.flwTransactionId,
      hasRedirect: Boolean(charge.redirectUrl),
    });

    return NextResponse.json({
      txRef,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency,
      exchangeRate: charge.exchangeRate,
      amountUsd,
      platformCurrency: PLATFORM_CURRENCY,
      country: charge.country,
      network: charge.network,
      redirectUrl: charge.redirectUrl,
      authorizationMode: charge.authorizationMode,
      pollUrl: `/api/payments/mobile-money/status?orderId=${orderId}&txRef=${encodeURIComponent(txRef)}`,
      message:
        charge.status === "pending"
          ? charge.authorizationMode === "push"
            ? "Check your phone and approve the payment."
            : "Waiting for Mobile Money confirmation…"
          : undefined,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[mobile-money/initiate] Unhandled error", {
      reason: reason.slice(0, 200),
      orderId,
    });
    return apiError(500, { code: "INTERNAL_ERROR", reason: "INTERNAL_ERROR" });
  }
}
