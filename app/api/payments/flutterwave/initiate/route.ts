import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { usdToRwfAmount } from "@/lib/money";
import { generateTxRef } from "@/lib/payments/tx-ref";
import { buildPaymentSnapshot } from "@/lib/payments/order-payment-utils";
import { verifyFlutterwaveTransaction, FlutterwaveAPIError } from "@/lib/payments/Transaction-verify";

export const dynamic = "force-dynamic";

type ApiError =
  | { code: "VALIDATION_ERROR"; details: z.ZodIssue[] }
  | { code: "ORDER_NOT_FOUND" }
  | { code: "ORDER_ALREADY_PAID"; currentStatus: string }
  | { code: "BUYER_EMAIL_MISSING" }
  | { code: "PAYMENT_LINK_FAILED"; reason: string }
  | { code: "INTERNAL_ERROR"; reason: string };

function apiError(status: number, error: ApiError) {
  return NextResponse.json({ error }, { status });
}

// ─── Input schema ────────────────────────────────────────────────────────────

const CHANNEL_VALUES = ["sms", "whatsapp", "sms,whatsapp"] as const;

const RequestSchema = z.object({
  orderId: z.string().uuid("orderId must be a valid UUID"),
  channel: z.enum(CHANNEL_VALUES).optional().default("sms"),
  returnUrl: z.string().url().optional(),
});

// ─── Constants ───────────────────────────────────────────────────────────────

const TERMINAL_STATUSES = new Set(["paid", "completed", "refunded"]);
const PENDING_TX_REUSE_WINDOW_MS = 60 * 60 * 1000;

const ALLOWED_RETURN_HOSTS = new Set([
  "jimvio.com",
  "www.jimvio.com",
  "localhost",
]);

// ─── Supabase ────────────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function extractProfile(
  raw: ProfileRow | ProfileRow[] | null
): ProfileRow | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

function normaliseToRwf(
  amount: number,
  currency: string
): { amount: number; currency: "RWF"; fxRate: number | null } {
  if (currency === "RWF") return { amount, currency: "RWF", fxRate: null };
  const converted = usdToRwfAmount(amount);
  const fxRate = amount > 0 ? converted / amount : null;
  return { amount: converted, currency: "RWF", fxRate };
}

function safeReturnUrl(
  origin: string,
  orderId: string,
  txRef: string
): string {
  const base = `${origin}/api/payments/flutterwave/callback`;
  return `${base}?order=${orderId}&tx_ref=${txRef}`;
}

async function buildAndReturnPaymentLink({
  supabase,
  req,
  returnUrl,
  orderId,
  txRef,
  amount,
  currency,
  profile,
  order,
  channel,
}: {
  supabase: ReturnType<typeof getSupabase>;
  req: NextRequest;
  returnUrl: string | undefined;
  orderId: string;
  txRef: string;
  amount: number;
  currency: "RWF";
  profile: ProfileRow;
  order: { order_number: string | null };
  channel: string;
}) {
  const origin =
    req.headers.get("origin") ??
    "https://www.jimvio.com";

  const redirectUrl = safeReturnUrl(origin, orderId, txRef);

  let paymentLink: string;
  try {
    paymentLink = await createFlutterwavePaymentLink({
      txRef,
      amount,
      currency,
      redirectUrl,
      customerEmail: profile.email!,
      customerName: profile.full_name ?? "Customer",
      customerPhone: profile.phone ?? "",
      orderDescription: `Order ${order.order_number ?? orderId.slice(0, 8)}`,
      paymentOptions: "card,applepay,googlepay,mobilemoneyrwanda",
      channel: "sms",
    });
  } catch (linkErr) {
    const reason = linkErr instanceof Error ? linkErr.message : String(linkErr);
    await supabase
      .from("transactions")
      .update({ status: "failed" })
      .eq("provider_transaction_id", txRef)
      .eq("provider", "flutterwave");
    return { error: apiError(502, { code: "PAYMENT_LINK_FAILED", reason }) };
  }

  return { paymentLink, redirectUrl: paymentLink, txRef };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await req.json();
    const parsed = RequestSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError(400, { code: "VALIDATION_ERROR", details: parsed.error.issues });
    }
    body = parsed.data;
  } catch {
    return apiError(400, {
      code: "VALIDATION_ERROR",
      details: [{ message: "Request body is not valid JSON", path: [], code: "custom" }],
    });
  }

  const { orderId, channel, returnUrl } = body;

  try {
    const supabase = getSupabase();

    // ── 1. Fetch order + buyer profile ────────────────────────────────────
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(`id, order_number, buyer_id, total_amount, currency, payment_status, metadata, profiles (full_name, email, phone)`)
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return apiError(404, { code: "ORDER_NOT_FOUND" });
    }

    if (TERMINAL_STATUSES.has(order.payment_status)) {
      return apiError(400, { code: "ORDER_ALREADY_PAID", currentStatus: order.payment_status });
    }

    const profile = extractProfile(order.profiles as ProfileRow | ProfileRow[] | null);
    if (!profile?.email) {
      return apiError(400, { code: "BUYER_EMAIL_MISSING" });
    }

    // ── 2. Normalize currency ─────────────────────────────────────────────
    const orderCurrency = (order.currency ?? "USD").toUpperCase();
    const { amount, currency, fxRate } = normaliseToRwf(Number(order.total_amount), orderCurrency);
    const isConverted = orderCurrency !== "RWF";
    const amountUsd = isConverted ? Number(order.total_amount) : null;
    const paymentSnapshot = buildPaymentSnapshot({
      orderTotal: Number(order.total_amount),
      orderCurrency,
      paymentAmount: amount,
      paymentCurrency: currency,
      exchangeRate: fxRate,
    });

    const existingMetadata =
      order.metadata && typeof order.metadata === "object" && !Array.isArray(order.metadata)
        ? (order.metadata as Record<string, unknown>)
        : {};

    await supabase
      .from("orders")
      .update({
        metadata: {
          ...existingMetadata,
          payment_snapshot: paymentSnapshot,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // ── 3. Check for a reusable pending transaction ───────────────────────
    const cutoff = new Date(Date.now() - PENDING_TX_REUSE_WINDOW_MS).toISOString();

    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id, provider_transaction_id, created_at, amount")
      .eq("order_id", orderId)
      .eq("provider", "flutterwave")
      .eq("status", "pending")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let txRef: string;

    if (existingTx) {
      let flwStatus: string;

      try {
        const verify = await verifyFlutterwaveTransaction(existingTx.provider_transaction_id);
        flwStatus = verify.data?.status?.toLowerCase() ?? "unknown";
      } catch (err) {
        if (err instanceof FlutterwaveAPIError && err.isNotFound) {
          flwStatus = "not_found";
        } else {
          throw err; // unexpected — let the outer catch log it
        }
      }

      if (flwStatus === "successful") {
        await supabase
          .from("transactions")
          .update({ status: "completed" })
          .eq("id", existingTx.id);
        return apiError(400, { code: "ORDER_ALREADY_PAID", currentStatus: "paid" });
      }

      if (flwStatus === "failed" || flwStatus === "not_found") {
        // Mark the stale record failed and fall through to create a new one
        await supabase
          .from("transactions")
          .update({ status: "failed" })
          .eq("id", existingTx.id);

        txRef = generateTxRef("FLW");
      } else {
        // Still pending on Flutterwave's side — reuse the existing tx_ref
        txRef = existingTx.provider_transaction_id;

        if (Number(existingTx.amount) !== amount) {
          await supabase
            .from("transactions")
            .update({
              amount,
              currency,
              amount_usd: amountUsd,
              exchange_rate: fxRate,
              metadata: {
                channel,
                initiated_at: new Date().toISOString(),
                original_currency: orderCurrency,
                original_amount: Number(order.total_amount),
                payment_snapshot: paymentSnapshot,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingTx.id);
        }

        const result = await buildAndReturnPaymentLink({
          supabase, req, returnUrl, orderId, txRef, amount, currency, profile, order, channel,
        });
        if (result.error) return result.error;
        return NextResponse.json({ redirectUrl: result.redirectUrl, txRef });
      }
    } else {
      // Expire any pending transactions outside the reuse window
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("order_id", orderId)
        .eq("provider", "flutterwave")
        .eq("status", "pending")
        .lt("created_at", cutoff);

      txRef = generateTxRef("FLW");
    }

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: order.buyer_id,
      order_id: orderId,
      type: "payment",
      direction: "credit",
      amount,
      currency,
      amount_usd: amountUsd,
      exchange_rate: fxRate,
      status: "pending",
      provider: "flutterwave",
      provider_transaction_id: txRef,
      description: `Order ${order.order_number}`,
      metadata: {
        channel,
        initiated_at: new Date().toISOString(),
        original_currency: orderCurrency,
        original_amount: Number(order.total_amount),
        payment_snapshot: paymentSnapshot,
      },
    });

    if (txError && txError.code !== "23505") {
      return apiError(500, { code: "INTERNAL_ERROR", reason: txError.message });
    }

    // ── 5. Build and return payment link ──────────────────────────────────
    const result = await buildAndReturnPaymentLink({
      supabase, req, returnUrl, orderId, txRef, amount, currency, profile, order, channel,
    });
    if (result.error) return result.error;
    return NextResponse.json({ redirectUrl: result.redirectUrl, txRef });

  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[flutterwave/initiate] Unhandled error", { reason, orderId });
    return apiError(500, { code: "INTERNAL_ERROR", reason });
  }
}