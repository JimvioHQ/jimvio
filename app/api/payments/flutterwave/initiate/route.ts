
// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";
// import { z } from "zod";
// import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
// import { usdToRwfAmount } from "@/lib/money";

// export const dynamic = "force-dynamic";

// // ─── Typed error envelope ────────────────────────────────────────────────────

// type ApiError =
//   | { code: "VALIDATION_ERROR"; details: z.ZodIssue[] }
//   | { code: "ORDER_NOT_FOUND" }
//   | { code: "ORDER_ALREADY_PAID"; currentStatus: string }
//   | { code: "BUYER_EMAIL_MISSING" }
//   | { code: "PAYMENT_LINK_FAILED"; reason: string }
//   | { code: "INTERNAL_ERROR"; reason: string };

// function apiError(status: number, error: ApiError) {
//   return NextResponse.json({ error }, { status });
// }

// // ─── Input schema ────────────────────────────────────────────────────────────

// const CHANNEL_VALUES = ["sms", "whatsapp", "sms,whatsapp"] as const;

// const RequestSchema = z.object({
//   orderId: z.string().uuid("orderId must be a valid UUID"),
//   channel: z.enum(CHANNEL_VALUES).optional().default("sms"),
// });

// // ─── Supabase client (lazy) ───────────────────────────────────────────────────

// function getSupabase() {
//   const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) throw new Error("Supabase env vars are not configured");
//   return createClient(url, key, {
//     auth: { autoRefreshToken: false, persistSession: false },
//   });
// }

// // ─── Profile helper ───────────────────────────────────────────────────────────

// type ProfileRow = {
//   full_name: string | null;
//   email: string | null;
//   phone: string | null;
// };

// function extractProfile(raw: ProfileRow | ProfileRow[] | null): ProfileRow | null {
//   if (!raw) return null;
//   return Array.isArray(raw) ? (raw[0] ?? null) : raw;
// }

// // ─── Currency helper ──────────────────────────────────────────────────────────

// function normaliseToRwf(
//   amount: number,
//   currency: string
// ): { amount: number; currency: "RWF" } {
//   if (currency === "RWF") return { amount, currency: "RWF" };
//   const converted = usdToRwfAmount(amount);
//   console.info("[flutterwave/initiate] Currency conversion", {
//     from: `${amount} ${currency}`,
//     to: `${converted} RWF`,
//   });
//   return { amount: converted, currency: "RWF" };
// }

// // ─── Route handler ────────────────────────────────────────────────────────────

// export async function POST(req: NextRequest) {
//   // 1. Parse + validate body
//   let body: z.infer<typeof RequestSchema>;
//   try {
//     const raw = await req.json();
//     const parsed = RequestSchema.safeParse(raw);
//     if (!parsed.success) {
//       return apiError(400, { code: "VALIDATION_ERROR", details: parsed.error.issues });
//     }
//     body = parsed.data;
//   } catch {
//     return apiError(400, {
//       code: "VALIDATION_ERROR",
//       details: [{ message: "Request body is not valid JSON", path: [], code: "custom" }],
//     });
//   }

//   const { orderId, channel } = body;

//   try {
//     const supabase = getSupabase();

//     // 2. Fetch order + buyer profile
//     const { data: order, error: fetchError } = await supabase
//       .from("orders")
//       .select(
//         `id,
//          order_number,
//          buyer_id,
//          total_amount,
//          currency,
//          payment_status,
//          profiles!orders_buyer_id_fkey (full_name, email, phone)`
//       )
//       .eq("id", orderId)
//       .single();

//     if (fetchError || !order) {
//       return apiError(404, { code: "ORDER_NOT_FOUND" });
//     }

//     // 3. Guard: never re-initiate a terminal order
//     const TERMINAL_STATUSES = new Set(["paid", "completed", "refunded"]);
//     if (TERMINAL_STATUSES.has(order.payment_status)) {
//       return apiError(400, {
//         code: "ORDER_ALREADY_PAID",
//         currentStatus: order.payment_status,
//       });
//     }

//     // 4. Guard: buyer must have an email for Flutterwave
//     const profile = extractProfile(order.profiles as ProfileRow | ProfileRow[] | null);
//     if (!profile?.email) {
//       return apiError(400, { code: "BUYER_EMAIL_MISSING" });
//     }

//     // 5. Build a collision-safe tx ref.
//     //    Date.now() + random UUID suffix avoids millisecond collisions
//     //    under concurrent requests.
//     const txRef = `TXID-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

//     const origin =
//       req.headers.get("origin") ??
//       process.env.NEXT_PUBLIC_APP_URL ??
//       "https://jimvio.com";

//     const redirectUrl =
//       `${origin}/checkout/success` +
//       `?order=${orderId}&provider=flutterwave&tx_ref=${txRef}`;

//     const { amount, currency } = normaliseToRwf(
//       Number(order.total_amount),
//       (order.currency ?? "USD").toUpperCase()
//     );

//     // 6. Create Flutterwave hosted payment link
//     let paymentLink: string;
//     try {
//       paymentLink = await createFlutterwavePaymentLink({
//         txRef,
//         amount,
//         currency,
//         redirectUrl,
//         customerEmail: profile.email,
//         customerName: profile.full_name ?? "Customer",
//         customerPhone: profile.phone ?? "",
//         orderDescription: `Order ${order.order_number ?? orderId.slice(0, 8)}`,
//         paymentOptions: "card,applepay,googlepay,mobilemoneyrwanda",
//         channel,
//       });
//     } catch (linkErr) {
//       const reason = linkErr instanceof Error ? linkErr.message : String(linkErr);
//       console.error("[flutterwave/initiate] Payment link creation failed", { reason, orderId });
//       return apiError(502, { code: "PAYMENT_LINK_FAILED", reason });
//     }

//     // 7. Persist a pending transaction row.
//     //
//     //    Design notes:
//     //    - provider_transaction_id = txRef is the bridge the webhook uses
//     //      to resolve the order (Option B — no extra columns needed on orders).
//     //    - webhook_event_id is intentionally omitted here; the webhook fills
//     //      it in once Flutterwave confirms payment.
//     //    - The unique constraint (provider, provider_transaction_id) is safe
//     //      because every initiation produces a fresh txRef.
//     const { error: txError } = await supabase.from("transactions").insert({
//       user_id: order.buyer_id,
//       order_id: orderId,
//       type: "payment",
//       direction: "credit",
//       amount,
//       currency,
//       status: "pending",
//       provider: "flutterwave",
//       provider_transaction_id: txRef,
//       description: `Order ${order.order_number}`,
//     });

//     if (txError) {
//       const reason = txError.message;
//       console.error("[flutterwave/initiate] Failed to create transaction record", {
//         reason,
//         orderId,
//         txRef,
//       });
//       return apiError(500, { code: "INTERNAL_ERROR", reason });
//     }

//     return NextResponse.json({ redirectUrl: paymentLink, txRef });
//   } catch (err) {
//     const reason = err instanceof Error ? err.message : String(err);
//     console.error("[flutterwave/initiate] Unhandled error", { reason, orderId });
//     return apiError(500, { code: "INTERNAL_ERROR", reason });
//   }
// }

// app/api/payments/flutterwave/initiate/route.ts

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
  // 1. Parse + validate body
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

    // 2. Fetch order + buyer profile
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select(
        `id,
         order_number,
         buyer_id,
         total_amount,
         currency,
         payment_status,
         profiles!orders_buyer_id_fkey (full_name, email, phone)`
      )
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return apiError(404, { code: "ORDER_NOT_FOUND" });
    }

    // 3. Guard: never re-initiate a terminal order
    const TERMINAL_STATUSES = new Set(["paid", "completed", "refunded"]);
    if (TERMINAL_STATUSES.has(order.payment_status)) {
      return apiError(400, {
        code: "ORDER_ALREADY_PAID",
        currentStatus: order.payment_status,
      });
    }

    // 4. Guard: buyer must have an email for Flutterwave
    const profile = extractProfile(order.profiles as ProfileRow | ProfileRow[] | null);
    if (!profile?.email) {
      return apiError(400, { code: "BUYER_EMAIL_MISSING" });
    }

    // 5. Idempotency — check if a pending transaction already exists for this order.
    //    If it does, reuse its txRef and regenerate the payment link instead of
    //    creating a duplicate row. This handles:
    //      - Double-clicks on the pay button
    //      - Frontend retries
    //      - Race conditions under concurrent requests
    const { data: existingTx } = await supabase
      .from("transactions")
      .select("id, provider_transaction_id")
      .eq("order_id", orderId)
      .eq("provider", "flutterwave")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Reuse existing txRef or generate a collision-safe new one.
    // Date.now() + UUID suffix prevents millisecond collisions under load.
    const txRef: string =
      existingTx?.provider_transaction_id ??
      `TXID-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;

    const isReused = !!existingTx;

    if (isReused) {
      console.info("[flutterwave/initiate] Reusing existing pending transaction", {
        orderId,
        txRef,
        transactionId: existingTx.id,
      });
    }

    // 6. Build redirect URL
    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_APP_URL ??
      "https://www.jimvio.com";

    const redirectUrl =
      `${origin}/checkout/success` +
      `?order=${orderId}&provider=flutterwave&tx_ref=${txRef}`;

    const { amount, currency } = normaliseToRwf(
      Number(order.total_amount),
      (order.currency ?? "USD").toUpperCase()
    );

    // 7. Create Flutterwave hosted payment link
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
      console.error("[flutterwave/initiate] Payment link creation failed", { reason, orderId });
      return apiError(502, { code: "PAYMENT_LINK_FAILED", reason });
    }

    // 8. Only insert a new transaction row when none exists.
    //    Skipping the insert when isReused = true prevents:
    //      - 23505 duplicate key violations
    //      - Orphaned pending rows from retries
    if (!isReused) {
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: order.buyer_id,
        order_id: orderId,
        type: "payment",
        direction: "credit",
        amount,
        currency,
        status: "pending",
        provider: "flutterwave",
        provider_transaction_id: txRef,
        description: `Order ${order.order_number}`,
        // webhook_event_id intentionally omitted — webhook fills this on confirmation
      });

      if (txError) {
        // 23505 = unique_violation — a concurrent request inserted the same txRef.
        // Safe to continue — the webhook will resolve via whichever row was committed.
        if (txError.code === "23505") {
          console.warn(
            "[flutterwave/initiate] Concurrent insert race — transaction already exists, continuing",
            { orderId, txRef }
          );
        } else {
          const reason = txError.message;
          console.error("[flutterwave/initiate] Failed to create transaction record", {
            reason,
            orderId,
            txRef,
          });
          return apiError(500, { code: "INTERNAL_ERROR", reason });
        }
      }
    }

    return NextResponse.json({ redirectUrl: paymentLink, txRef });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[flutterwave/initiate] Unhandled error", { reason, orderId });
    return apiError(500, { code: "INTERNAL_ERROR", reason });
  }
}