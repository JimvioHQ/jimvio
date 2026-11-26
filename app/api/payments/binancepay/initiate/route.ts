import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createBinancePayOrder } from "@/lib/binance-pay";
import { getAdminDB } from "@/services/db";
import { createTransaction } from "@/lib/actions/create-transaction";
import { formatTransactionValidationError } from "@/lib/payments/transaction-types";
import { recordBothStatusChanges } from "@/lib/payments/record-status-change";

import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/service-role";
// ─── Runtime ──────────────────────────────────────────────────────────────────
// Force Node.js runtime — required on Render for crypto, fetch, and cookie APIs.
// Do NOT use "edge" here; Supabase SSR and cookies() require Node runtime.
export const runtime = "nodejs";

// ─── Constants ────────────────────────────────────────────────────────────────
const PENDING_TX_REUSE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_CURRENCY = "USD";
const SETTLE_CURRENCY = "USDT";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// FIX 1: Use the exact frontend origin — NOT "*"
// Reason: The browser sends credentials (Supabase auth cookies) on cross-origin
// requests. The CORS spec FORBIDS wildcard origin when credentials are present.
// A wildcard here causes the browser to silently block the response → "Failed to fetch"
//
// FIX 2: Add Access-Control-Allow-Credentials: true
// Required whenever the frontend fetch uses credentials:'include'
//
// FIX 3: Add Vary: Origin
// Prevents Render's routing layer or any CDN from caching a CORS-less response
// and serving it to subsequent cross-origin requests.
const ALLOWED_ORIGINS = new Set([
  "https://www.jimvio.com",
  "https://jimvio.com",
  "http://localhost:3000",
]);

function buildCorsHeaders(req?: NextRequest): HeadersInit {
  const origin = req?.headers.get("origin") ?? "";
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://www.jimvio.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin",
  };
}

// ─── OPTIONS handler ──────────────────────────────────────────────────────────
// FIX 4: Return 204 No Content (the correct preflight response status).
// Some browsers and proxies treat 200 with a null body suspiciously.
// 204 is the RFC-correct status for a successful preflight with no body.
//
// FIX 5: This handler must be exported from this file — App Router only uses
// the OPTIONS export from the route file itself, not from middleware or config.
// Without this explicit export, Next.js App Router returns a 405 for OPTIONS
// which the browser treats as a failed preflight → "Failed to fetch"
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(req),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function errorResponse(
  message: string,
  status: number,
  detailsOrReq?: Record<string, unknown> | NextRequest,
  maybeReq?: NextRequest
): NextResponse {
  const req =
    detailsOrReq instanceof Request
      ? detailsOrReq
      : maybeReq instanceof Request
        ? maybeReq
        : undefined;
  const details =
    detailsOrReq && !(detailsOrReq instanceof Request)
      ? detailsOrReq
      : undefined;

  return NextResponse.json(
    { success: false, error: message, ...(details ?? {}) },
    { status, headers: buildCorsHeaders(req) }
  );
}

function describeError(err: unknown): {
  message: string;
  code?: string;
  cause?: string;
} {
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

function isUUID(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
  );
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
  const data = (await res.json()) as { rates?: Record<string, number> };
  const rate = data.rates?.[toCurrency.toUpperCase()];
  if (!rate || typeof rate !== "number" || rate <= 0) {
    throw new Error(`No valid rate found for ${fromCurrency} → ${toCurrency}`);
  }
  return rate;
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Parse & validate request body ──────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Request body must be valid JSON", 400, req);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Request body must be a JSON object", 400, req);
  }

  const { orderId } = body as Record<string, unknown>;

  if (!orderId) {
    return errorResponse("orderId is required", 400, req);
  }
  if (!isUUID(orderId)) {
    return errorResponse("orderId must be a valid UUID", 400, req);
  }

  // ── 2. Build Supabase client ───────────────────────────────────────────────
  const cookieStore = await cookies();
  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  // ── 3. Authenticate ────────────────────────────────────────────────────────
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("Unauthorized — please sign in", 401, req);
  }

  // ── 4. Load & validate order ───────────────────────────────────────────────
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_amount, currency, status, payment_status, metadata, jimvio_store_id"
    )
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (orderError) {
    if (orderError.code === "PGRST116") {
      return errorResponse("Order not found or does not belong to you", 404, req);
    }
    console.error("[binance/create] order fetch error", orderError);
    return errorResponse("Failed to load order", 500, req);
  }

  if (!order) {
    return errorResponse("Order not found", 404, req);
  }

  if (typeof order.total_amount !== "number" || order.total_amount <= 0) {
    return errorResponse("Order has an invalid amount", 422, req);
  }

  if (!order.currency || typeof order.currency !== "string") {
    return errorResponse("Order has no currency set", 422, req);
  }

  const nonPayableStatuses = ["paid", "completed", "refunded", "cancelled"];
  if (nonPayableStatuses.includes(order.payment_status)) {
    return errorResponse(
      `Order cannot be paid — current payment status is "${order.payment_status}"`,
      409,
      { currentStatus: order.payment_status }
    , req);
  }

  // "processing" is expected after Binance creates a payment session. It is
  // payable again only through the existing, idempotently reused session below.
  if (!["pending", "processing"].includes(String(order.payment_status))) {
    return errorResponse(
      `Order payment status "${order.payment_status}" is not payable`,
      409,
      { currentStatus: order.payment_status }
    , req);
  }

  if (order.status === "cancelled") {
    return errorResponse("Cannot pay a cancelled order", 409, {
      currentStatus: order.status,
    }, req);
  }

  // ── 5. Validate env ────────────────────────────────────────────────────────
  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.error("[binance/create] NEXT_PUBLIC_APP_URL is not set");
    return errorResponse("Server configuration error", 500, req);
  }

  let storeHandle: string | null = null;
  const storeId = (order as { jimvio_store_id?: string | null }).jimvio_store_id;
  if (storeId) {
    const { data: storeRow } = await supabase
      .from("jimvio_stores")
      .select("handle")
      .eq("id", storeId)
      .maybeSingle();
    storeHandle = storeRow?.handle ?? null;
  }
  const { buildCustomerPaymentReturnUrls } = await import(
    "@/lib/payments/customer-return-origin"
  );
  const returns = buildCustomerPaymentReturnUrls({
    orderId,
    storeHandle,
    request: req,
    queryExtra: { provider: "binance" },
  });

  // ── 6. Check for a reusable pending transaction ────────────────────────────
  const cutoff = new Date(
    Date.now() - PENDING_TX_REUSE_WINDOW_MS
  ).toISOString();

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id, provider_transaction_id, metadata, created_at")
    .eq("order_id", orderId)
    .eq("provider", "binance")
    .in("status", ["pending", "processing"])
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingTx) {
    const txMeta = existingTx.metadata as Record<string, unknown> | null;
    const prepayId = txMeta?.prepay_id as string | undefined;
    const expireTime = txMeta?.expire_time as number | undefined;

    if (prepayId && expireTime && expireTime > Date.now()) {
      const checkoutUrl = txMeta?.checkout_url as string | undefined;
      const qrContent = txMeta?.qr_content as string | undefined;

      if (checkoutUrl) {
        return NextResponse.json(
          {
            success: true,
            redirectUrl: checkoutUrl,
            qrContent,
            prepayId,
            expiresAt: new Date(expireTime).toISOString(),
            reused: true,
          },
          { headers: buildCorsHeaders(req) }
        );
      }
    }

    // Session expired or incomplete — mark it failed and issue a fresh one
    await supabase
      .from("transactions")
      .update({ status: "failed" })
      .eq("id", existingTx.id);
  }

  // Do not start Binance while a different provider still has an active
  // transaction for this order. A completed transaction also needs reconciliation
  // before another charge can be created.
  const { data: otherActiveTransactions, error: otherActiveError } = await supabase
    .from("transactions")
    .select("id, provider, status")
    .eq("order_id", orderId)
    .neq("provider", "binance")
    .in("status", ["pending", "processing"])
    .limit(1);
  if (otherActiveError) {
    return errorResponse("Could not verify the existing payment state. Please try again.", 503, req);
  }
  if (otherActiveTransactions?.length) {
    return errorResponse(
      "Another payment is already active for this order. Finish it from Orders before choosing Binance Pay.",
      409,
      { reason: "another_payment_active" },
      req
    );
  }

  const { data: completedTransactions, error: completedError } = await supabase
    .from("transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "completed")
    .limit(1);
  if (completedError) {
    return errorResponse("Could not verify the existing payment state. Please try again.", 503, req);
  }
  if (completedTransactions?.length) {
    return errorResponse(
      "A payment was already received and is being confirmed. Please check Orders before trying again.",
      409,
      { reason: "payment_received_pending_reconciliation" },
      req
    );
  }

  // Expire any other stale Binance transactions outside the reuse window.
  await supabase
    .from("transactions")
    .update({ status: "failed" })
    .eq("order_id", orderId)
    .eq("provider", "binance")
    .in("status", ["pending", "processing"])
    .lt("created_at", cutoff);

  // A stale processing flag without an active provider transaction is safe to
  // reset; this prevents old attempts from blocking a fresh, verified session.
  if (order.payment_status === "processing") {
    const { error: resetError } = await supabase
      .from("orders")
      .update({ payment_status: "pending", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .eq("payment_status", "processing");
    if (resetError) {
      return errorResponse("Could not safely reset the previous payment attempt. Please open Orders.", 503, req);
    }
  }

  // ── 7. Currency conversion ─────────────────────────────────────────────────
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
      , req);
    }

    payAmount = Number((order.total_amount * exchangeRate).toFixed(2));
    payCurrency = SETTLE_CURRENCY;

    if (payAmount <= 0) {
      return errorResponse(
        "Converted payment amount is invalid. Please contact support.",
        422
      , req);
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

  // ── 8. Build merchantTradeNo ───────────────────────────────────────────────
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
    , req);
  }

  const attemptSuffix = Date.now().toString(36).toUpperCase();
  const merchantTradeNo = `${sanitizedOrderNumber}${attemptSuffix}`.slice(
    0,
    32
  );

  // ── 9. Create Binance Pay order ────────────────────────────────────────────
  let binanceOrder: Awaited<ReturnType<typeof createBinancePayOrder>>;
  try {
    binanceOrder = await createBinancePayOrder({
      merchantOrderId: merchantTradeNo,
      orderAmount: payAmount,
      currency: payCurrency,
      description: `Order ${sanitizedOrderNumber}`,
      returnUrl: returns.successUrl,
      cancelUrl: returns.cancelUrl,
    });
    console.info("[binance/create] Binance Pay order created", {
      orderId,
      merchantTradeNo,
      payAmount,
      payCurrency,
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
        "Could not reach Binance Pay. The payment service is temporarily unreachable. Please try a different payment method.",
        502,
        { reason: "network", detail: info.cause ?? info.message }
      , req);
    }

    return errorResponse(
      `Payment gateway error: ${info.message}. Please try again or use a different payment method.`,
      502,
      { reason: "gateway" }
    , req);
  }

  if (!binanceOrder?.prepayId || !binanceOrder?.checkoutUrl) {
    console.error(
      "[binance/create] Binance returned incomplete order",
      binanceOrder
    );
    return errorResponse(
      "Payment gateway returned an incomplete response. Please try again.",
      502
    , req);
  }

  // ── 10. Record transaction ─────────────────────────────────────────────────
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
      console.error("[binance/create] transaction ref conflict", {
        merchantTradeNo,
        orderId,
      });
      return errorResponse("Payment ref conflict. Please try again.", 409, {
        reason: "conflict",
      }, req);
    }
    if (txResult.validation) {
      console.error(
        "[binance/create] createTransaction validation failed",
        formatTransactionValidationError(txResult.issues)
      );
      return errorResponse(
        "Invalid payment data. Please contact support.",
        422
      , req);
    }
    console.error(
      "[binance/create] failed to insert transaction record",
      txResult.error
    );
    return errorResponse(
      "Failed to record payment attempt. Please try again.",
      500
    , req);
  }

  console.info("[binance/create] transaction record created", {
    transactionId: txResult.transactionId,
    merchantTradeNo,
    orderId,
  });

  // ── 11. Persist Binance metadata on the order (best-effort) ───────────────
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
    console.error(
      "[binance/create] order metadata update failed — webhook will use transactions fallback",
      updateError
    );
    // Soft-fail: transaction row already binds merchantTradeNo → order_id.
    // Webhook resolves via provider_transaction_id when metadata is missing.
  }

  // ── 12. Record status changes ──────────────────────────────────────────────
  await recordBothStatusChanges(
    getAdminDB(),
    orderId,
    {
      previousOrderStatus: order.status,
      newOrderStatus: "pending",
      previousPaymentStatus: order.payment_status,
      newPaymentStatus: "processing",
    },
    {
      triggeredBy: "system",
      provider: "binance",
    }
  );

  // ── 13. Success ────────────────────────────────────────────────────────────
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
    { headers: buildCorsHeaders(req) }
  );
}
