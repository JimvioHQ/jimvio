/**
 * app/api/payments/pawapay/callback/route.ts
 *
 * PawaPay Deposit Callback — the endpoint PawaPay POSTs to when a
 * deposit status changes (COMPLETED, FAILED, etc.).
 *
 * Configure in PawaPay dashboard:
 *   Callback URL → https://jimvio.com/api/payments/pawapay/callback
 *
 * PawaPay sends: { depositId, status, ... }
 * We look up the order by pawapay_deposit_id, verify with the API,
 * then finalize + update order status.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { finalizeOrderPayment } from "@/lib/payments/finalize-order-payment";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // PawaPay callback payload: { depositId, status, ... }
    const depositId =
      (body.depositId as string) ||
      ((body.data as Record<string, unknown>)?.depositId as string) ||
      null;

    const rawStatus =
      (body.status as string) ||
      ((body.data as Record<string, unknown>)?.status as string) ||
      "";

    const upperStatus = rawStatus.toUpperCase();

    console.log(`[PawaPay Callback] depositId=${depositId} status=${upperStatus}`);

    if (!depositId) {
      console.warn("[PawaPay Callback] No depositId in payload — ignoring");
      return NextResponse.json({ received: true });
    }

    // Acknowledge immediately for non-actionable statuses
    if (upperStatus !== "COMPLETED" && upperStatus !== "FAILED") {
      console.log(`[PawaPay Callback] Non-actionable status: ${upperStatus}`);
      return NextResponse.json({ received: true });
    }

    // Look up order by pawapay_deposit_id (set when initiating checkout)
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, payment_status, buyer_id, total_amount")
      .eq("pawapay_deposit_id", depositId)
      .maybeSingle();

    if (orderErr || !order) {
      console.error(`[PawaPay Callback] Order not found for depositId=${depositId}`);
      // Return 200 so PawaPay doesn't retry indefinitely for unknown deposits
      return NextResponse.json({ received: true });
    }

    console.log(`[PawaPay Callback] Found order ${order.id}, current status: ${order.payment_status}`);

    // Already finalized — idempotent return
    if (order.payment_status === "completed") {
      console.log(`[PawaPay Callback] Order ${order.id} already completed. Skipping.`);
      return NextResponse.json({ received: true });
    }

    if (upperStatus === "FAILED") {
      await supabase
        .from("orders")
        .update({
          payment_status: "failed",
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .neq("payment_status", "completed");

      console.log(`[PawaPay Callback] Order ${order.id} marked as failed.`);
      return NextResponse.json({ received: true });
    }

    // COMPLETED — verify with PawaPay API before finalizing
    const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
    const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
    const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

    if (apiToken) {
      try {
        const verifyRes = await fetch(`${baseUrl}/deposits/${depositId}`, {
          headers: { Authorization: `Bearer ${apiToken}` },
          cache: "no-store",
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          const depositEntry = Array.isArray(verifyData) ? verifyData[0] : verifyData;
          const confirmedStatus = (depositEntry?.status as string)?.toUpperCase();

          if (confirmedStatus !== "COMPLETED") {
            console.warn(
              `[PawaPay Callback] API says status is ${confirmedStatus}, not COMPLETED. Skipping finalization.`
            );
            return NextResponse.json({ received: true });
          }
          console.log(`[PawaPay Callback] API confirmed COMPLETED for depositId=${depositId}`);
        } else {
          console.warn(`[PawaPay Callback] API verification returned ${verifyRes.status}. Proceeding with callback status.`);
        }
      } catch (verifyErr) {
        console.warn("[PawaPay Callback] API verify failed — proceeding with callback status:", verifyErr);
      }
    }

    // Finalize — updates payment_status + status, credits vendor wallets, sends notifications
    await finalizeOrderPayment(supabase, order.id, {
      providerTransactionId: depositId,
      providerReference: depositId,
      paidAtIso: new Date().toISOString(),
      notifyUserId: order.buyer_id,
      paymentProvider: "pawapay",
      webhookReference: `pawapay-deposit-${depositId}`,
    });

    // Stamp gateway
    await supabase
      .from("orders")
      .update({
        gateway_used: "pawapay",
        payment_provider: "pawapay",
        pawapay_deposit_id: depositId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    console.log(`[PawaPay Callback] ✅ Order ${order.id} finalized successfully.`);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[PawaPay Callback] Unhandled error:", msg);
    // Return 500 so PawaPay retries the callback
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
