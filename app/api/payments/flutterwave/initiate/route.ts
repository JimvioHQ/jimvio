import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { usdToRwfAmount } from "@/lib/money";

export const dynamic = "force-dynamic";

// ─── Typed error envelope ────────────────────────────────────────────────────

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
});

// ─── Supabase (lazy) ──────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── Profile helper ───────────────────────────────────────────────────────────

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

function extractProfile(raw: ProfileRow | ProfileRow[] | null): ProfileRow | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

// ─── Currency helper ──────────────────────────────────────────────────────────

function normaliseToRwf(
  amount: number,
  currency: string
): { amount: number; currency: "RWF" } {
  if (currency === "RWF") return { amount, currency: "RWF" };
  const converted = usdToRwfAmount(amount);
  console.info("[flutterwave/initiate] Currency conversion", {
    from: `${amount} ${currency}`,
    to: `${converted} RWF`,
  });
  return { amount: converted, currency: "RWF" };
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

  const { orderId, channel } = body;

  try {
    const supabase = getSupabase();

    // 1. Fetch order + buyer profile
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        `id,
         order_number,
         buyer_id,
         total_amount,
         currency,
         payment_status,
         profiles (full_name, email, phone)`
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return apiError(404, { code: "ORDER_NOT_FOUND" });
    }

    // 2. Guard: never re-initiate a terminal order
    const TERMINAL_STATUSES = new Set(["paid", "completed", "refunded"]);
    if (TERMINAL_STATUSES.has(order.payment_status)) {
      return apiError(400, {
        code: "ORDER_ALREADY_PAID",
        currentStatus: order.payment_status,
      });
    }

    // 3. Guard: buyer must have an email
    const profile = extractProfile(order.profiles as ProfileRow | ProfileRow[] | null);
    if (!profile?.email) {
      return apiError(400, { code: "BUYER_EMAIL_MISSING" });
    }

    // 4. Normalize currency BEFORE anything else
    const { amount, currency } = normaliseToRwf(
      Number(order.total_amount),
      (order.currency ?? "USD").toUpperCase()
    );

    const isConverted = (order.currency ?? "USD").toUpperCase() !== "RWF";
    const amountUsd = isConverted ? Number(order.total_amount) : null;
    const exchangeRate = isConverted ? amount / Number(order.total_amount) : null;

    // 5. Idempotency — reuse existing pending transaction if any
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id, provider_transaction_id")
      .eq("order_id", orderId)
      .eq("provider", "flutterwave")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const txRef: string =
      existingTx?.provider_transaction_id ??
      `TXID-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const isReused = !!existingTx;

    // ─────────────────────────────────────────────────────────
    if (!isReused) {
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: order.buyer_id,
          order_id: orderId,
          type: "payment",
          direction: "credit",
          amount,
          currency,
          amount_usd: amountUsd,
          exchange_rate: exchangeRate,
          status: "pending",
          provider: "flutterwave",
          provider_transaction_id: txRef,
          description: `Order ${order.order_number}`,
          metadata: {
            channel,
            initiated_at: new Date().toISOString(),
          },
        });

      if (txError) {
        // 23505 = unique_violation — concurrent request already inserted
        if (txError.code !== "23505") {
          console.error("[flutterwave/initiate] Failed to create transaction", {
            reason: txError.message,
            orderId,
            txRef,
          });
          // ⛔ Stop here — don't create payment link without a transaction record
          return apiError(500, { code: "INTERNAL_ERROR", reason: txError.message });
        }
        console.warn("[flutterwave/initiate] Concurrent insert race — continuing", {
          orderId,
          txRef,
        });
      }
    }

    // ─────────────────────────────────────────────────────────
    // 7. Save txRef to orders so webhook can find it directly
    // ─────────────────────────────────────────────────────────
    await supabase
      .from("orders")
      .update({
        flutterwave_tx_ref: txRef,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // ─────────────────────────────────────────────────────────
    // 8. NOW create the payment link — transaction is already saved
    // ─────────────────────────────────────────────────────────
    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://www.jimvio.com";

    const redirectUrl =
      `${origin}/checkout/success` +
      `?order=${orderId}&provider=flutterwave&tx_ref=${txRef}`;

    let paymentLink: string;
    try {
      paymentLink = await createFlutterwavePaymentLink({
        txRef,
        amount,
        currency,
        redirectUrl,
        customerEmail: profile.email,
        customerName: profile.full_name ?? "Customer",
        customerPhone: profile.phone ?? "",
        orderDescription: `Order ${order.order_number ?? orderId.slice(0, 8)}`,
        paymentOptions: "card,applepay,googlepay,mobilemoneyrwanda",
        channel,
      });
    } catch (linkErr) {
      const reason = linkErr instanceof Error ? linkErr.message : String(linkErr);
      console.error("[flutterwave/initiate] Payment link creation failed", {
        reason,
        orderId,
      });

      // 9. Roll back — mark transaction as failed so it's not reused
      await supabase
        .from("transactions")
        .update({ status: "failed" })
        .eq("provider_transaction_id", txRef)
        .eq("provider", "flutterwave");

      return apiError(502, { code: "PAYMENT_LINK_FAILED", reason });
    }

    return NextResponse.json({ redirectUrl: paymentLink, txRef });

  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[flutterwave/initiate] Unhandled error", { reason, orderId });
    return apiError(500, { code: "INTERNAL_ERROR", reason });
  }
}