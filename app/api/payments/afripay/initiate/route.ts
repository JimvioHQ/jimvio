import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initiateAfriPayPayment } from "@/lib/payments/afripay";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, orderIds, network, phoneNumber } = body as {
      orderId?: string;
      orderIds?: string[];
      network?: "MTN" | "BK" | "MPESA";
      phoneNumber?: string;
    };

    if (!orderId) return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    if (!network) return NextResponse.json({ error: "Missing network" }, { status: 400 });
    if (!phoneNumber) return NextResponse.json({ error: "Missing phoneNumber" }, { status: 400 });

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, total_amount, currency, payment_status")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "completed") {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    const orderAmount = Number(order.total_amount);
    if (!Number.isFinite(orderAmount) || orderAmount <= 0) {
      return NextResponse.json({ error: "Invalid order amount" }, { status: 400 });
    }

    const protocol = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const res = await initiateAfriPayPayment({
      transactionId: orderId,
      amountUSD: order.currency === "USD" ? orderAmount : orderAmount / 1300, // naive fallback if RWF wasn't USD, but afripay converts from USD
      currency: "RWF",
      phone: phoneNumber,
      network,
      description: `Payment for order ${orderId.slice(0, 8)}`,
      callbackUrl: `${baseUrl}/api/webhooks/afripay`,
    });

    if (res.status === "FAILED") {
      return NextResponse.json({ error: res.error || "AfriPay refused payment" }, { status: 400 });
    }

    await supabase
      .from("orders")
      .update({
        payment_external_reference: res.transactionId || orderId,
        payment_provider: "afripay",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Also update any other selected orders to align their payment status to afripay
    if (orderIds && orderIds.length > 1) {
       await supabase
         .from("orders")
         .update({
           payment_external_reference: res.transactionId || orderId,
           payment_provider: "afripay",
           updated_at: new Date().toISOString()
         })
         .in("id", orderIds);
    }

    return NextResponse.json({
      status: "ACCEPTED",
      transactionId: res.transactionId || orderId,
      message: "Payment initiated. Approve on your phone.",
    });
  } catch (err) {
    console.error("[AfriPay initiate Route]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Initiation failed" }, { status: 500 });
  }
}
