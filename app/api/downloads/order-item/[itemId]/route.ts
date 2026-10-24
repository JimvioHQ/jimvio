import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mayServeExistingDownload, mayServeLegacyStoredDownload } from "@/lib/digital-products/trust/policy";
import { getDeliveryGate } from "@/lib/digital-products/trust/service";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";

/** Entitlement-checked handoff. Does not return a stored file URL in the response body. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: item } = await supabase
    .from("order_items")
    .select("id, product_id, order_id, orders!inner(buyer_id, payment_status, status, total_amount)")
    .eq("id", itemId)
    .maybeSingle();

  const order = Array.isArray(item?.orders) ? item?.orders[0] : item?.orders;
  if (!item || order?.buyer_id !== user.id || !item.product_id) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }
  const cancelled = String(order?.status || "").toLowerCase() === "cancelled";
  const paid = !cancelled && (
    isOrderPaymentComplete(order?.payment_status)
    || Number(order?.total_amount) === 0
  );
  if (!paid) {
    return NextResponse.json({
      error: cancelled ? "This order is cancelled." : "Payment has not been confirmed.",
    }, { status: 403 });
  }

  const { data: access } = await supabase
    .from("digital_access")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", item.product_id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!access?.id) {
    const { data: stored } = await supabase
      .from("order_items")
      .select("digital_download_url, access_granted_at")
      .eq("id", itemId)
      .maybeSingle();
    const gate = await getDeliveryGate(item.product_id).catch(() => null);
    const legacyUrl = stored?.digital_download_url;
    const paymentComplete = isOrderPaymentComplete(order?.payment_status)
      || (order?.status !== "cancelled" && Number(order?.total_amount) === 0);
    const legacy = mayServeLegacyStoredDownload({
      gateLoaded: Boolean(gate),
      verificationState: gate?.verificationState ?? null,
      fulfillment: gate?.fulfillment ?? null,
      acquisitionModel: gate?.acquisitionModel ?? null,
      paymentComplete,
      storedUrlIsHttps: Boolean(legacyUrl && legacyUrl.startsWith("https://")),
      previouslyGranted: Boolean(stored?.access_granted_at),
    });
    if (!legacy.allowed || !legacyUrl) {
      return NextResponse.json({ error: legacy.reason }, { status: 403 });
    }
    return NextResponse.redirect(legacyUrl);
  }

  const gate = await getDeliveryGate(item.product_id).catch(() => null);
  if (!gate) {
    return NextResponse.json({ error: "Delivery status could not be confirmed." }, { status: 403 });
  }
  if (gate.schemaReady) {
    const decision = mayServeExistingDownload({
      hasEntitlement: true,
      verificationState: gate.verificationState,
      fulfillment: gate.fulfillment,
      acquisitionModel: gate.acquisitionModel,
      enforcementBlocksDelivery: gate.enforcementBlocksDelivery,
      scanStatus: gate.scanStatus as never,
    });
    if (!decision.allowed) {
      return NextResponse.json({ error: decision.reason }, { status: 403 });
    }
  }

  return NextResponse.redirect(new URL(`/api/files/access/${access.id}`, _req.url));
}
