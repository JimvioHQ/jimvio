import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { iremboPay } from "@/services/payments/irembopay";
import { z } from "zod";

const schema = z.object({
  orderIds: z.array(z.string().uuid()).min(1),
});

/** Single Irembo checkout for one or more pending cart orders (same buyer). */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { orderIds } = schema.parse(body);

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, total_amount, currency, order_number")
      .in("id", orderIds)
      .eq("buyer_id", user.id)
      .eq("status", "pending");

    if (ordersError || !orders?.length || orders.length !== orderIds.length) {
      return NextResponse.json({ error: "Invalid or unauthorized orders" }, { status: 403 });
    }

    const currency = orders[0].currency || "RWF";
    if (!orders.every((o) => (o.currency || "RWF") === currency)) {
      return NextResponse.json({ error: "All orders must use the same currency" }, { status: 400 });
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    if (totalAmount <= 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    const { data: profile } = await supabase.from("profiles").select("email, full_name, phone").eq("id", user.id).single();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const primaryOrderId = orderIds[0];
    const description = `Jimvio — ${orders.length} order(s): ${orders.map((o) => o.order_number).join(", ")}`;

    const result = await iremboPay.initializePayment({
      amount: totalAmount,
      currency,
      orderId: `cart-${primaryOrderId}`,
      description,
      customerEmail: profile?.email || user.email!,
      customerName: profile?.full_name || undefined,
      customerPhone: profile?.phone || undefined,
      callbackUrl: `${baseUrl}/api/payments/webhook`,
      returnUrl: `${baseUrl}/dashboard/orders?checkout=irembo`,
      metadata: {
        jimvio_order_ids: orderIds.join(","),
      },
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const { error: txError } = await supabase.from("transactions").insert({
      user_id: user.id,
      reference: result.data!.reference,
      type: "order_payment",
      amount: totalAmount,
      currency,
      status: "pending",
      provider: "irembopay",
      provider_transaction_id: result.data!.transactionId,
      description,
      order_id: null,
      metadata: { order_ids: orderIds },
    });

    if (txError) {
      console.error("Transaction insert failed", txError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("initialize-cart error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
