import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ensureNativeVendorCreditsApplied } from "@/lib/payments/credit-vendors-for-native-order";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // Simple admin auth check via header
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const db = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Verify the order exists and is completed
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

    // 2. Fetch the corresponding successful transaction to get the providerTransactionId
    const { data: tx } = await db
      .from("transactions")
      .select("provider_transaction_id")
      .eq("order_id", orderId)
      .eq("status", "successful")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const providerTransactionId = tx?.provider_transaction_id || `MANUAL-RETRY-${Date.now()}`;

    // 3. Re-run the idempotent credit logic
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
