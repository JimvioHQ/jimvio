import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureNativeVendorCreditsApplied } from "@/lib/payments/credit-vendors-for-native-order";

export const dynamic = "force-dynamic";

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(req: NextRequest) {
  // Auth guard
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find orders that are paid but vendor credits may have been missed
  // (webhook_events.status = 'failed' within last 24 hours)
  const { data: failedEvents } = await adminDb
    .from("webhook_events")
    .select("id, order_id, provider, idempotency_key, payload")
    .eq("status", "failed")
    .not("order_id", "is", null)
    .gte("created_at", oneDayAgo)
    .limit(20);

  if (!failedEvents?.length) {
    return NextResponse.json({ processed: 0, message: "No failed events found" });
  }

  let recovered = 0;
  let skipped = 0;

  for (const event of failedEvents) {
    if (!event.order_id) continue;

    const { data: order } = await adminDb
      .from("orders")
      .select("id, payment_status, payment_provider, created_at")
      .eq("id", event.order_id)
      .single();

    if (!order) continue;

    // Skip orders in grace period or already completed
    if (order.created_at > fiveMinutesAgo) {
      skipped++;
      continue;
    }

    // If order is completed — ensure vendor credits were applied (idempotent)
    if (order.payment_status === "completed") {
      try {
        await ensureNativeVendorCreditsApplied(adminDb, order.id, {
          providerTransactionId: event.idempotency_key,
          paymentProvider: event.provider ?? order.payment_provider ?? null,
        });

        // Mark the failed event as processed
        await adminDb
          .from("webhook_events")
          .update({ status: "processed", updated_at: new Date().toISOString() })
          .eq("id", event.id);

        recovered++;
        console.log(`[cron/retry] ✓ Credits recovered for order ${order.id}`);
      } catch (e) {
        console.error(`[cron/retry] ✗ Credit recovery failed for ${order.id}:`, e);
      }
    } else {
      // Order still not completed — log for manual review
      console.warn(
        `[cron/retry] Order ${order.id} is not completed (status=${order.payment_status}). ` +
          `Failed webhook: ${event.idempotency_key}. Manual review needed.`
      );
    }
  }

  return NextResponse.json({
    processed: failedEvents.length,
    recovered,
    skipped,
    message: `Recovered credits for ${recovered} orders`,
  });
}
