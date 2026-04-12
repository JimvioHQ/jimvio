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
      channel?: "sms" | "whatsapp" | "sms,whatsapp";
    };

    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Fetch order + buyer profile
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        `id, order_number, total_amount, currency, shipping_address, payment_status,
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

    const txRef = randomUUID(); // Our unique reference to Flutterwave
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://jimvio.com";

    const redirectUrl = `${origin}/checkout/success?order=${orderId}&provider=flutterwave&tx_ref=${txRef}`;

    let amount = Number(order.total_amount);
    let currency = (order.currency || "USD").toUpperCase();

    // CRITICAL: Flutterwave Hosted Checkout ONLY shows 'mobilemoneyrwanda' if the currency is RWF.
    // Since we want the user to choose between Card and MoMo on Flutterwave's site,
    // we MUST use RWF. If the order is in USD, we convert it now.
    if (currency !== "RWF") {
      const { usdToRwfAmount } = await import("@/lib/money");
      const converted = usdToRwfAmount(amount);
      console.log("[Flutterwave initiate] Converting order to RWF to enable MoMo on FLW site:", { from: `${amount} ${currency}`, to: `${converted} RWF` });
      amount = converted;
      currency = "RWF";
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
      paymentOptions: "card,applepay,googlepay,mobilemoneyrwanda",
      channel: body.channel || "sms",
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
