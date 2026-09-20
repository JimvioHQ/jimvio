// app/api/payments/paypal/create-order/route.ts
// Step 1: Create a PayPal order and return the approval URL.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createPayPalOrder } from "@/lib/paypal";
import { orderTotalsForUsdGateway } from "@/lib/money";
import { requireSessionUser, notFoundIfInvalidId } from "@/lib/auth/require-session";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
export const dynamic = "force-dynamic";

const supabase = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const session = await requireSessionUser();
    if ("error" in session) return session.error;

    const body = (await req.json()) as { orderId?: string; orderIds?: string[] };
    const orderId = body.orderId?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }
    const bad = notFoundIfInvalidId(orderId);
    if (bad) return bad;

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, currency, payment_status, buyer_id, paypal_order_id, jimvio_store_id")
      .eq("id", orderId)
      .eq("buyer_id", session.user.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (isOrderPaymentComplete(order.payment_status)) {
      return NextResponse.json({ error: "Order already paid" }, { status: 400 });
    }

    let storeHandle: string | null = null;
    const storeId = (order as { jimvio_store_id?: string | null }).jimvio_store_id;
    if (storeId) {
      const { data: storeRow } = await supabase
        .from("jimvio_stores")
        .select("handle")
        .eq("id", storeId)
        .maybeSingle();
      storeHandle = storeRow?.handle ?? null;
    }
    const { buildCustomerPaymentReturnUrls, resolveTrustedRequestOrigin } = await import(
      "@/lib/payments/customer-return-origin"
    );
    const returns = buildCustomerPaymentReturnUrls({
      orderId,
      storeHandle,
      request: req,
      queryExtra: { provider: "paypal" },
    });
    const apiOrigin =
      resolveTrustedRequestOrigin(req) ||
      returns.origin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.jimvio.com";

    // Idempotent reuse only when PayPal order still matches Jimvio total.
    if (order.paypal_order_id) {
      try {
        const { getPayPalOrder } = await import("@/lib/paypal");
        const existing = await getPayPalOrder(order.paypal_order_id);
        const unit = (existing as {
          purchase_units?: Array<{ amount?: { value?: string; currency_code?: string } }>;
        }).purchase_units?.[0];
        const existingAmount = unit?.amount?.value != null ? Number(unit.amount.value) : null;
        const existingCurrency = (unit?.amount?.currency_code || "").toUpperCase();
        const expected = orderTotalsForUsdGateway(Number(order.total_amount), order.currency);
        if (
          existingAmount != null &&
          existingCurrency &&
          Math.abs(existingAmount - expected.amount) <= 0.05 &&
          existingCurrency === expected.currency.toUpperCase()
        ) {
          const approvalUrl = `https://www.paypal.com/checkoutnow?token=${encodeURIComponent(order.paypal_order_id)}`;
          return NextResponse.json({
            paypalOrderId: order.paypal_order_id,
            approvalUrl,
            reused: true,
          });
        }
      } catch (reuseErr) {
        console.warn("[PayPal create-order] reuse check failed; creating new order", reuseErr);
      }
    }

    const paypalTotals = orderTotalsForUsdGateway(Number(order.total_amount), order.currency);
    const { orderId: paypalOrderId, approvalUrl } = await createPayPalOrder({
      jimvioOrderId: orderId,
      amount: paypalTotals.amount,
      currency: paypalTotals.currency,
      description: `Jimvio Order ${order.order_number || orderId.slice(0, 8)}`,
      returnUrl: `${apiOrigin.replace(/\/$/, "")}/api/payments/paypal/capture?orderId=${orderId}`,
      cancelUrl: returns.cancelUrl,
    });

    // Save PayPal order ID to our DB immediately
    const requestedIds = body.orderIds?.length ? body.orderIds : [orderId];
    const { data: owned } = await supabase
      .from("orders")
      .select("id")
      .in("id", requestedIds)
      .eq("buyer_id", session.user.id);
    const orderIdsToUpdate = (owned ?? []).map((row) => row.id);
    if (!orderIdsToUpdate.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    await supabase
      .from("orders")
      .update({
        paypal_order_id: paypalOrderId,
        payment_provider: "paypal",
        updated_at: new Date().toISOString(),
      })
      .in("id", orderIdsToUpdate);

    await supabase.from("transactions").insert({
      user_id: session.user.id,
      order_id: orderId,
      type: "payment",
      amount: paypalTotals.amount,
      currency: paypalTotals.currency,
      status: "pending",
      provider: "paypal",
      provider_transaction_id: paypalOrderId,
      reference: paypalOrderId,
      description: `PayPal order ${paypalOrderId}`,
      metadata: { purpose: "order_payment" },
    });

    return NextResponse.json({ approvalUrl, paypalOrderId });
  } catch (err) {
    console.error("[PayPal create-order]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PayPal order creation failed" },
      { status: 500 }
    );
  }
}
