// app/api/payments/flutterwave/initiate/route.ts
// Creates a Flutterwave hosted payment link for an order.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { createFlutterwavePaymentLink } from "@/lib/flutterwave";
import { orderTotalsForUsdGateway } from "@/lib/money";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderId?: string;
      orderIds?: string[];
    };

    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Fetch order + buyer profile
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `id, order_number, total_amount, currency, payment_status,
         payment_batch_id,
         profiles!orders_buyer_id_fkey (full_name, email, phone)`
      )
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "paid" || order.payment_status === "completed") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    type ProfileRow = { full_name: string | null; email: string | null; phone: string | null };
    const rawProfile = order.profiles as ProfileRow | ProfileRow[] | null;
    const profile = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;

    if (!profile?.email) {
      return NextResponse.json(
        { error: "Buyer email required for Flutterwave payment" },
        { status: 400 }
      );
    }

    const { orderIds, method } = body as { orderIds?: string[]; method?: "card" | "momo" };

    const txRef = randomUUID(); // Our unique reference to Flutterwave
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://jimvio.com";

    const redirectUrl = `${origin}/checkout/success?order=${orderId}&provider=flutterwave&tx_ref=${txRef}`;

    console.log("[Flutterwave initiate] Processing order:", { orderId, rawAmount: order.total_amount, rawCurrency: order.currency, method });

    let amount = Number(order.total_amount);
    let currency = (order.currency || "USD").toUpperCase();

    // DYNAMIC CURRENCY HANDLING based on method choice:
    if (method === "momo") {
      // For MoMo, we always favor RWF (local) to ensure provider compatibility
      if (currency !== "RWF") {
        const { usdToRwfAmount } = await import("@/lib/money");
        const converted = usdToRwfAmount(amount);
        console.log("[Flutterwave initiate] Converting USD order to RWF for MoMo:", { from: amount, to: converted });
        amount = converted;
        currency = "RWF";
      }
    } else {
      // For Card/Apple Pay, we favor USD (global) to ensure conversion on customer's side works best
      if (currency !== "USD") {
        const { rwfToUsdAmount } = await import("@/lib/money");
        const converted = rwfToUsdAmount(amount);
        console.log("[Flutterwave initiate] Converting RWF order to USD for Card:", { from: amount, to: converted });
        amount = converted;
        currency = "USD";
      }
    }

    const paymentLink = await createFlutterwavePaymentLink({
      txRef,
      amount,
      currency,
      redirectUrl,
      customerEmail: profile.email,
      customerName: profile.full_name || "Customer",
      customerPhone: profile.phone || "",
      orderDescription: `Order ${order.order_number || orderId.slice(0, 8)}`,
      paymentOptions: method === "momo" ? "mobilemoneyrwanda" : "card,applepay,googlepay",
    });

    // Save tx_ref to order so webhook can reconcile
    const orderIdsToUpdate = body.orderIds?.length ? body.orderIds : [orderId];
    await supabase
      .from("orders")
      .update({
        flutterwave_tx_ref: txRef,
        payment_provider: "flutterwave",
        updated_at: new Date().toISOString(),
      })
      .in("id", orderIdsToUpdate);

    return NextResponse.json({ redirectUrl: paymentLink, txRef });
  } catch (err) {
    console.error("[Flutterwave initiate]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
