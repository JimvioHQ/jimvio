import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPayment } from "@/services/nowpayments";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { orderIds, totalAmount, currency = "usd", payCurrency = "btc" } = body as {
      orderIds: string[];
      totalAmount: number;
      currency?: string;
      payCurrency?: string;
    };

    if (!orderIds?.length || totalAmount == null || totalAmount <= 0) {
      return NextResponse.json(
        { error: "orderIds and totalAmount are required" },
        { status: 400 }
      );
    }

    // Convert RWF to USD if needed
    let amountUsd = totalAmount;
    if (currency.toLowerCase() === "rwf") {
      const rate = parseFloat(process.env.RWF_TO_USD_RATE || "0.0008");
      amountUsd = totalAmount * rate;
    }

    if (amountUsd < 1) {
      return NextResponse.json(
        { error: "Minimum payment amount is $1 USD equivalent" },
        { status: 400 }
      );
    }

    // Verify user owns these orders
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, order_number, total_amount")
      .in("id", orderIds)
      .eq("buyer_id", user.id)
      .eq("status", "pending");

    if (ordersError || !orders?.length || orders.length !== orderIds.length) {
      return NextResponse.json({ error: "Invalid or unauthorized orders" }, { status: 403 });
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
      success_url: `${baseUrl}/dashboard/orders?payment=success`,
      cancel_url: `${baseUrl}/cart?payment=cancelled`,
    });

    // Store NowPayments payment_id on orders and set payment_status to processing
    await supabase
      .from("orders")
      .update({
        nowpayments_payment_id: payment.payment_id,
        payment_status: "processing",
      })
      .in("id", orderIds);

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
