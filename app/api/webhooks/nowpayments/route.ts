import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { validateIPNSignature } from "@/services/nowpayments";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig");
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
      console.error("[webhooks/nowpayments] NOWPAYMENTS_IPN_SECRET not configured");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (!validateIPNSignature(rawBody, signature, ipnSecret)) {
      console.error("[webhooks/nowpayments] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody) as {
      payment_id: number;
      payment_status: string;
      order_id: string;
      price_amount?: number;
    };

    const { payment_status, order_id, payment_id } = payload;

    if (payment_status !== "finished" && payment_status !== "confirmed") {
      return NextResponse.json({ received: true });
    }

    const orderIds = order_id
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (orderIds.length === 0) {
      return NextResponse.json({ received: true });
    }

    const paidAtIso = new Date().toISOString();
    const refStr = String(payment_id);

    for (const oid of orderIds) {
      const { data: ord } = await supabase.from("orders").select("buyer_id, payment_status").eq("id", oid).single();
      if (ord?.payment_status === "completed") {
        continue;
      }
      try {
        await finalizeOrderPayment(supabase, oid, {
          providerTransactionId: refStr,
          providerReference: refStr,
          paidAtIso,
          notifyUserId: ord?.buyer_id ?? null,
          nowpaymentsPaymentId: payment_id,
          webhookReference: refStr,
          paymentProvider: "nowpayments",
        });
        await supabase.from("orders").update({ gateway_used: "nowpayments" }).eq("id", oid);
      } catch (e) {
        console.error("[webhooks/nowpayments] finalize", oid, e);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[webhooks/nowpayments]", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
