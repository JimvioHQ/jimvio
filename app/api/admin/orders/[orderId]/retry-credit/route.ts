import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureNativeVendorCreditsApplied } from "@/lib/payments/credit-vendors-for-native-order";
import { getSupabaseSecretKey } from "@/lib/supabase/service-role";
import { getSupabaseUrl } from "@/lib/supabase/public-env";
import { requireAdminSessionOrCron } from "@/lib/ops/admin-or-cron";
import { isUuid } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const gate = await requireAdminSessionOrCron(req);
  if (!gate.ok) return gate.error;

  const { orderId } = await params;
  if (!isUuid(orderId)) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseSecretKey();
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: order, error } = await db
      .from("orders")
      .select("id, payment_status, payment_provider")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status !== "completed") {
      return NextResponse.json(
        { error: `Cannot credit vendors. Order status is '${order.payment_status}' instead of 'completed'.` },
        { status: 400 }
      );
    }

    const { data: tx } = await db
      .from("transactions")
      .select("provider_transaction_id")
      .eq("order_id", orderId)
      .eq("status", "successful")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const providerTransactionId = tx?.provider_transaction_id || `MANUAL-RETRY-${Date.now()}`;

    await ensureNativeVendorCreditsApplied(db, orderId, {
      providerTransactionId,
      paymentProvider: order.payment_provider || "system_retry",
    });

    return NextResponse.json({
      success: true,
      message: `Successfully verified/applied credits for vendors on order ${orderId}`,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
