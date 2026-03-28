import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * PesaPal IPN can arrive as GET with query params (configuration-dependent).
 * Full confirmation should use PesaPal GetTransactionStatus — this updates tracking + gateway_used.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderTrackingId =
    url.searchParams.get("OrderTrackingId") ||
    url.searchParams.get("order_tracking_id") ||
    url.searchParams.get("OrderTrackingID");
  const orderMerchantReference =
    url.searchParams.get("OrderMerchantReference") ||
    url.searchParams.get("order_merchant_reference") ||
    url.searchParams.get("merchant_reference");

  if (!orderMerchantReference?.trim()) {
    console.warn("[webhooks/pesapal] missing OrderMerchantReference");
    return NextResponse.json({ received: true });
  }

  const ref = orderMerchantReference.trim();

  let row: { id: string; pesapal_tracking_id: string | null } | null = null;

  const byMerchant = await supabase
    .from("orders")
    .select("id, pesapal_tracking_id")
    .eq("pesapal_merchant_ref", ref)
    .maybeSingle();

  if (byMerchant.data) row = byMerchant.data;

  if (!row && UUID_RE.test(ref)) {
    const byId = await supabase.from("orders").select("id, pesapal_tracking_id").eq("id", ref).maybeSingle();
    if (byId.data) row = byId.data;
  }

  if (!row) {
    const byExt = await supabase.from("orders").select("id, pesapal_tracking_id").eq("payment_external_id", ref).maybeSingle();
    if (byExt.data) row = byExt.data;
  }

  if (!row) {
    console.warn("[webhooks/pesapal] order not found for ref", ref, orderTrackingId);
    return NextResponse.json({ received: true });
  }

  const patch: Record<string, string> = { gateway_used: "pesapal" };
  if (orderTrackingId && row.pesapal_tracking_id !== orderTrackingId) {
    patch.pesapal_tracking_id = orderTrackingId;
  }

  await supabase.from("orders").update(patch).eq("id", row.id);

  return NextResponse.json({ received: true });
}
