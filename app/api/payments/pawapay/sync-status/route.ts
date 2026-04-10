import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    const { orderId, trackingId } = await request.json();

    if (!orderId || !trackingId) {
      return NextResponse.json({ error: "Missing orderId or trackingId" }, { status: 400 });
    }

    const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
    if (!apiToken) {
      return NextResponse.json({ error: "Missing Pawapay config" }, { status: 500 });
    }

    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    // Call PawaPay to verify
    const verifyRes = await fetch(`${baseUrl}/v2/deposits/${trackingId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
      },
      cache: "no-store",
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json();
      console.error("pawaPay sync-status verify fail:", err);
      return NextResponse.json({ error: "Verification failed", details: err }, { status: 400 });
    }

    // PawaPay returns an array or single object depending on deposit query
    const data = await verifyRes.json();
    const depositEntry = Array.isArray(data) ? data[0] : data;

    if (!depositEntry) {
      return NextResponse.json({ error: "No deposit found" }, { status: 404 });
    }

    const status = depositEntry.status;

    // Retrieve order
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id")
      .eq("id", orderId)
      .single();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status === "completed") {
      return NextResponse.json({ status: "ALREADY_COMPLETED", data: depositEntry });
    }

    if (status === "COMPLETED") {
      try {
        await finalizeOrderPayment(supabase, orderId, {
          providerTransactionId: trackingId,
          providerReference: trackingId,
          paidAtIso: new Date().toISOString(),
          notifyUserId: order.buyer_id,
          paymentProvider: "pawapay",
          webhookReference: `deposit:${trackingId}`,
        });

        // Ensure gateway_used is set
        await supabase
          .from("orders")
          .update({
            gateway_used: "pawapay",
            payment_provider: "pawapay",
          })
          .eq("id", orderId);
          
      } catch (finalizeErr) {
        console.error("Failed to finalize order payment for PawaPay:", finalizeErr);
      }
    } else if (status === "FAILED" || status === "REJECTED") {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          payment_provider: "pawapay",
        })
        .eq("id", orderId);
    }

    return NextResponse.json({ status, data: depositEntry });
  } catch (error: any) {
    console.error("pawapay sync-status error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
