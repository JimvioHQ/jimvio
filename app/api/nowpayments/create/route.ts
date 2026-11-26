import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayment } from "@/services/nowpayments";
import type { Database } from "@/types/supabase";
import { TransactionInsert } from "@/types/db";
import { orderTotalsForUsdGateway } from "@/lib/money";
import { notFoundIfInvalidId } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type OrderUpdate = Database["public"]["Tables"]["orders"]["Update"];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, payCurrency = "btc" } = body as {
      orderIds: string[];
      totalAmount?: number;
      currency?: string;
      payCurrency?: string;
    };

    if (!orderIds?.length) {
      return NextResponse.json(
        { error: "orderIds are required" },
        { status: 400 }
      );
    }
    for (const id of orderIds) {
      const bad = notFoundIfInvalidId(id);
      if (bad) return bad;
    }

    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, currency")
      .in("id", orderIds)
      .eq("buyer_id", user.id)
      .in("status", ["pending", "checkout_direct"]);

    if (ordersError || !orders?.length || orders.length !== orderIds.length) {
      return NextResponse.json({ error: "Invalid or unauthorized orders" }, { status: 403 });
    }

    const totalAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const { amount: amountUsd } = orderTotalsForUsdGateway(totalAmount, orders[0].currency);

    if (amountUsd < 1) {
      return NextResponse.json(
        { error: "Minimum payment amount is $1 USD equivalent" },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const payment = await createPayment({
      price_amount: Math.round(amountUsd * 100) / 100,
      price_currency: "usd",
      pay_currency: payCurrency.toLowerCase(),
      order_id: orderIds.join(","),
      order_description: `Jimvio order(s): ${orders.map((o) => o.order_number).join(", ")}`,
      ipn_callback_url: `${baseUrl}/api/nowpayments/ipn`,
      success_url: `${baseUrl}/orders?payment=success`,
      cancel_url: `${baseUrl}/cart?payment=cancelled`,
    });

    const admin = createServiceRoleClient();
    await admin
      .from("orders")
      .update({ payment_status: "processing" } satisfies OrderUpdate)
      .in("id", orders.map((row) => row.id))
      .eq("buyer_id", user.id);

    const txRows = orderIds.map((orderId) => ({
      user_id: user.id,
      order_id: orderId,
      reference: `nowpayments-${payment.payment_id}-${orderId}`,
      type: "payment",
      direction: "credit" as const,
      amount: amountUsd / orderIds.length,
      currency: "USD",
      status: "processing" as const,
      provider: "nowpayments",
      provider_transaction_id: String(payment.payment_id),
      description: `NowPayments crypto payment`,
    }))  as TransactionInsert[];

    await admin.from("transactions").insert(txRows);

    return NextResponse.json({
      paymentId: payment.payment_id,
      payAddress: payment.pay_address,
      payAmount: payment.pay_amount,
      payCurrency: payment.pay_currency,
      priceAmount: payment.price_amount,
      priceCurrency: payment.price_currency,
      orderId: payment.order_id,
      status: payment.payment_status,
      createdAt: payment.created_at,
      expirationEstimateDate: payment.expiration_estimate_date,
    });
  } catch (error: any) {
    console.error("NowPayments create error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment" },
      { status: 500 }
    );
  }
}
