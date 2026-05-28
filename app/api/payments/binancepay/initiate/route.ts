import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createBinancePayOrder } from "@/lib/binance-pay";
import { getAdminDB } from "@/services/db";
import {
  createTransaction,
} from "@/lib/actions/create-transaction";
import { formatTransactionValidationError } from "@/lib/payments/transaction-types";
import { recordBothStatusChanges } from "@/lib/payments/record-status-change";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}
function errorResponse(
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { success: false, error: message, ...(details ?? {}) },
    {
      status,
      headers: corsHeaders,
    }
  );
}
// ─── Constants ─────────────────────────────────────────────
const PENDING_TX_REUSE_WINDOW_MS = 60 * 60 * 1000;
function describeError(err: unknown): { message: string; code?: string; cause?: string } {
  if (!(err instanceof Error)) return { message: String(err) };

  const cause = (err as Error & { cause?: unknown }).cause;
  const code = (err as Error & { code?: string }).code;

  if (cause instanceof Error) {
    const causeCode = (cause as Error & { code?: string }).code;
    return {
      message: err.message,
      code: code ?? causeCode,
      cause: causeCode ? `${cause.message} (${causeCode})` : cause.message,
    };
  }
  return { message: err.message, code };
}

async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return 1;

  const res = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${fromCurrency.toUpperCase()}`,
    { signal: AbortSignal.timeout(5_000) }
  );

  if (!res.ok) {
    throw new Error(
      `Exchange rate service returned ${res.status} for ${fromCurrency}`
    );
  }

  const data = await res.json();
  const rate = data.rates?.[toCurrency.toUpperCase()];

  if (!rate || typeof rate !== "number" || rate <= 0) {
    throw new Error(`No valid rate found for ${fromCurrency} → ${toCurrency}`);
  }

  return rate;
}

function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PENDING_TX_REUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_CURRENCY = "USD";
const SETTLE_CURRENCY = "USDT";

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Parse & validate request body ────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Request body must be a JSON object", 400);
  }

  const { orderId } = body as Record<string, unknown>;

  if (!orderId) {
    return errorResponse("orderId is required", 400);
  }
  if (!isUUID(orderId)) {
    return errorResponse("orderId must be a valid UUID", 400);
  }

  // ── 2. Build Supabase client ─────────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => { },
      },
    }
  );

  // ── 3. Authenticate ──────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Unauthorized — please sign in", 401);
  }

  // ── 4. Load & validate order ─────────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, status, payment_status, metadata"
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (orderError) {
    if (orderError.code === "PGRST116") {
      return errorResponse("Order not found or does not belong to you", 404);
    }
    console.error("[binance/create] order fetch error", orderError);
    return errorResponse("Failed to load order", 500);
  }

  if (!order) {
    return errorResponse("Order not found", 404);
  }

  if (typeof order.total_amount !== "number" || order.total_amount <= 0) {
    return errorResponse("Order has an invalid amount", 422);
  }

  if (!order.currency || typeof order.currency !== "string") {
    return errorResponse("Order has no currency set", 422);
  }

  const nonPayableStatuses = ["paid", "completed", "refunded", "cancelled"];
  if (nonPayableStatuses.includes(order.payment_status)) {
    return errorResponse(
      `Order cannot be paid — current payment status is "${order.payment_status}"`,
      409,
      { currentStatus: order.payment_status }
    );
  }

  if (order.payment_status !== "pending") {
    return errorResponse(
      `Order payment status "${order.payment_status}" is not payable`,
      409,
      { currentStatus: order.payment_status }
    );
  }

  if (order.status === "cancelled") {
    return errorResponse("Cannot pay a cancelled order", 409, {
      currentStatus: order.status,
    });
  }

  // ── 5. Validate env ──────────────────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("[binance/create] NEXT_PUBLIC_APP_URL is not set");
    return errorResponse("Server configuration error", 500);
  }

  // ── 6. Check for a reusable pending transaction ──────────────────────────────
  // Mirror the Flutterwave approach: query the transactions table instead of
  // reading raw order.metadata, so session reuse is consistent across gateways.
  const cutoff = new Date(Date.now() - PENDING_TX_REUSE_WINDOW_MS).toISOString();

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id, provider_transaction_id, metadata, created_at")
    .eq("order_id", orderId)
    .eq("provider", "binance")
    .eq("status", "pending")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTx) {
    const txMeta = existingTx.metadata as Record<string, unknown> | null;
    const prepayId = txMeta?.prepay_id as string | undefined;
    const expireTime = txMeta?.expire_time as number | undefined;

    // Reuse if the Binance session hasn't expired yet
    if (prepayId && expireTime && expireTime > Date.now()) {
      const checkoutUrl = txMeta?.checkout_url as string | undefined;
      const qrContent = txMeta?.qr_content as string | undefined;

      if (checkoutUrl) {
        return NextResponse.json({
          success: true,
          redirectUrl: checkoutUrl,
          qrContent,
          prepayId,
          expiresAt: new Date(expireTime).toISOString(),
          reused: true,
        });
      }
    }

    // Session expired or incomplete — mark it failed and issue a fresh one
    await supabase
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", existingTx.id);
  }

  // Expire any other stale pending transactions outside the reuse window
  await supabase
    .from("transactions")
    .update({ status: "failed" })
    .eq("order_id", orderId)
    .eq("provider", "binance")
    .eq("status", "pending")
    .lt("created_at", cutoff);

  // ── 7. Currency conversion ───────────────────────────────────────────────────
  let payAmount = order.total_amount;
  let payCurrency = order.currency;
  let exchangeRate = 1;

  if (order.currency.toUpperCase() !== SETTLE_CURRENCY) {
    try {
      exchangeRate = await getExchangeRate(order.currency, RATE_CURRENCY);
    } catch (rateErr) {
      const info = describeError(rateErr);
      console.error("[binance/create] exchange rate error", info);
      return errorResponse(
        `Could not fetch exchange rate: ${info.message}. Please try again.`,
        503
      );
    }

    payAmount = Number((order.total_amount * exchangeRate).toFixed(2));
    payCurrency = SETTLE_CURRENCY;

    if (payAmount <= 0) {
      return errorResponse(
        "Converted payment amount is invalid. Please contact support.",
        422
      );
    }

    const admin = getAdminDB();
    const { error: logError } = await admin
      .from("exchange_rate_logs")
      .insert({
        from_currency: order.currency,
        to_currency: SETTLE_CURRENCY,
        rate: exchangeRate,
        order_id: order.id,
      });

    if (logError) {
      console.warn("[binance/create] failed to log exchange rate", logError);
    }
  }

  // ── 8. Build merchantTradeNo ─────────────────────────────────────────────────
  const sanitizedOrderNumber = (order.order_number ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 16);

  if (!sanitizedOrderNumber) {
    console.error("[binance/create] order has no usable order_number", {
      orderId,
      order_number: order.order_number,
    });
    return errorResponse(
      "This order is missing required data (order number). Please contact support.",
      422,
      { field: "order_number" }
    );
  }

  const attemptSuffix = Date.now().toString(36).toUpperCase();
  const merchantTradeNo = `${sanitizedOrderNumber}${attemptSuffix}`.slice(0, 32);

  // ── 9. Create Binance Pay order ──────────────────────────────────────────────
  let binanceOrder: Awaited<ReturnType<typeof createBinancePayOrder>>;
  try {
    binanceOrder = await createBinancePayOrder({
      merchantOrderId: merchantTradeNo,
      orderAmount: payAmount,
      currency: payCurrency,
      description: `Order ${sanitizedOrderNumber}`,
      returnUrl: `${appUrl}/checkout/success?orderId=${orderId}`,
      cancelUrl: `${appUrl}/checkout/cancel?orderId=${orderId}`,
    });
    console.info("[binance/create] Binance Pay order created", {
      orderId,
      merchantTradeNo,
      payAmount,
      payCurrency,
      binanceOrder,
    });
  } catch (binanceErr) {
    const info = describeError(binanceErr);

    console.error("[binance/create] Binance API error", {
      message: info.message,
      code: info.code,
      cause: info.cause,
      orderId,
      payAmount,
      payCurrency,
    });

    const isNetwork =
      info.cause?.includes("timeout") ||
      info.cause?.includes("ENOTFOUND") ||
      info.cause?.includes("ECONNREFUSED") ||
      info.cause?.includes("ECONNRESET") ||
      info.code === "UND_ERR_CONNECT_TIMEOUT";

    if (isNetwork) {
      return errorResponse(
        "Could not reach Binance Pay. The payment service is temporarily unreachable from our servers. Please try a different payment method.",
        502,
        { reason: "network", detail: info.cause ?? info.message }
      );
    }

    return errorResponse(
      `Payment gateway error: ${info.message}. Please try again or use a different payment method.`,
      502,
      { reason: "gateway" }
    );
  }

  if (!binanceOrder?.prepayId || !binanceOrder?.checkoutUrl) {
    console.error("[binance/create] Binance returned incomplete order", binanceOrder);
    return errorResponse(
      "Payment gateway returned an incomplete response. Please try again.",
      502
    );
  }

  const txResult = await createTransaction(getAdminDB(), {
    userId: user.id,
    orderId,
    amount: payAmount,
    currency: payCurrency,
    amountUsd: payCurrency === SETTLE_CURRENCY ? payAmount : null,
    exchangeRate: exchangeRate !== 1 ? exchangeRate : null,
    provider: "binance",
    providerTransactionId: merchantTradeNo,
    description: `Order ${sanitizedOrderNumber}`,
    metadata: {
      prepay_id: binanceOrder.prepayId,
      checkout_url: binanceOrder.checkoutUrl,
      qr_content: binanceOrder.qrContent ?? null,
      expire_time: binanceOrder.expireTime,
      original_currency: order.currency,
      original_amount: order.total_amount,
    },
  });



  if (!txResult.success) {
    if (txResult.conflict) {
      console.error("[binance/create] transaction ref conflict", { merchantTradeNo, orderId });
      return errorResponse(
        "Payment ref conflict. Please try again.",
        409,
        { reason: "conflict" }
      );
    }
    if (txResult.validation) {
      console.error(
        "[binance/create] createTransaction validation failed",
        formatTransactionValidationError(txResult.issues)
      );
      return errorResponse("Invalid payment data. Please contact support.", 422);
    }
    console.error("[binance/create] failed to insert transaction record", txResult.error);
    return errorResponse("Failed to record payment attempt. Please try again.", 500);
  }

  console.info("[binance/create] transaction record created", {
    transactionId: txResult.transactionId,
    merchantTradeNo,
    orderId,
  });

  // ── 11. Persist Binance metadata on the order (best-effort) ─────────────────
  // The transactions row is the authoritative record; this is a convenience
  // cache on the order for quick dashboard lookups. Non-fatal if it fails.
  const updatedMetadata = {
    ...(order.metadata ?? {}),
    binance_merchant_trade_no: merchantTradeNo,
    binance_prepay_id: binanceOrder.prepayId,
    binance_expire_time: binanceOrder.expireTime,
    binance_pay_currency: payCurrency,
    binance_pay_amount: payAmount,
    binance_exchange_rate: exchangeRate,
    binance_original_currency: order.currency,
    binance_original_amount: order.total_amount,
  };

  const { error: updateError } = await supabase
    .from("orders")
    .update({ metadata: updatedMetadata })
    .eq("id", orderId);
  if (updateError) {
    // Non-fatal — webhook reconciles via transactions table, not order.metadata
    console.warn(
      "[binance/create] order metadata update failed (non-fatal, tx row exists)",
      updateError
    );
  }

  await recordBothStatusChanges(
    getAdminDB(),
    orderId,
    {
      previousOrderStatus: order.status,
      newOrderStatus: "pending",
      previousPaymentStatus: txResult.success ? "pending" : order.payment_status,
      newPaymentStatus: "processing",
    },
    {
      triggeredBy: "system",
      provider: "binance",
    }
  );
  // ── 12. Success ──────────────────────────────────────────────────────────────
  return NextResponse.json(
  {
    success: true,
    redirectUrl: binanceOrder.checkoutUrl,
    qrContent: binanceOrder.qrContent,
    prepayId: binanceOrder.prepayId,
    expiresAt: new Date(binanceOrder.expireTime).toISOString(),
    payAmount,
    payCurrency,
    exchangeRate,
  },
  {
    headers: corsHeaders,
  }
);
}
