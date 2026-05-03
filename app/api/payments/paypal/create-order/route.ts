// app/api/payments/paypal/create-order/route.ts
// Step 1: Create a PayPal order and return the approval URL.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPayPalOrder } from "@/lib/paypal";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { orderId?: string; orderIds?: string[] };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, currency, payment_status")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "paid" || order.payment_status === "completed") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://jimvio.com";

    const { orderId: paypalOrderId, approvalUrl } = await createPayPalOrder({
      jimvioOrderId: orderId,
      amount: Number(order.total_amount),
      currency: order.currency || "USD",
      description: `Jimvio Order ${order.order_number || orderId.slice(0, 8)}`,
      returnUrl: `${origin}/api/payments/paypal/capture?orderId=${orderId}`,
      cancelUrl: `${origin}/checkout/cancel?order=${orderId}&provider=paypal`,
    });

    // Save PayPal order ID to our DB immediately
    const orderIdsToUpdate = body.orderIds?.length ? body.orderIds : [orderId];
    await supabase
      .from("orders")
      .update({
        paypal_order_id: paypalOrderId,
        payment_provider: "paypal",
        updated_at: new Date().toISOString(),
      })
      .in("id", orderIdsToUpdate);

    return NextResponse.json({ approvalUrl, paypalOrderId });
  } catch (err) {
    console.error("[PayPal create-order]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal order creation failed" },
      { status: 500 }
    );
  }
}
