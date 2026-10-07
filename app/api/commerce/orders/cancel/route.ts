import { NextRequest, NextResponse } from "next/server";
import { cosTable } from "@/lib/commerce-os/db";
import {
  requireCommerceMerchant,
  cosAdminDb,
  assertStoreOwnedByVendor,
} from "@/lib/commerce-os";

export const dynamic = "force-dynamic";

/**
 * Cancel a store-scoped order when business rules allow.
 * Pending payment → cancel + release inventory holds.
 * Paid/shipped → refuse; use refund workflow instead.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCommerceMerchant();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = (await req.json().catch(() => null)) as {
    storeId?: string;
    orderId?: string;
    reason?: string;
  } | null;

  if (!body?.storeId || !body?.orderId) {
    return NextResponse.json(
      { error: "storeId and orderId are required." },
      { status: 400 },
    );
  }

  const db = cosAdminDb();
  if (!(await assertStoreOwnedByVendor(db, body.storeId, auth.vendorId))) {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const { data: order } = await db
    .from("orders")
    .select("id, jimvio_store_id, payment_status, status, tracking_number")
    .eq("id", body.orderId)
    .eq("jimvio_store_id", body.storeId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const pay = String(order.payment_status || "").toLowerCase();
  const st = String(order.status || "").toLowerCase();

  if (["shipped", "delivered"].includes(st) || order.tracking_number) {
    return NextResponse.json(
      {
        error:
          "Shipped orders cannot be cancelled from Commerce OS. Use refunds if payment was captured.",
      },
      { status: 409 },
    );
  }

  if (["paid", "completed", "success"].includes(pay)) {
    return NextResponse.json(
      {
        error:
          "This order is already paid. Cancellation does not refund payment — use the refund action.",
        code: "USE_REFUND",
      },
      { status: 409 },
    );
  }

  if (["cancelled", "refunded"].includes(st) || pay === "cancelled") {
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  const { error } = await db
    .from("orders")
    .update({
      status: "cancelled",
      payment_status: pay === "pending" || !pay ? "cancelled" : order.payment_status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("jimvio_store_id", body.storeId);

  if (error) {
    return NextResponse.json({ error: "Could not cancel order." }, { status: 500 });
  }

  await cosTable(db, "jimvio_inventory_holds")
    .update({ status: "released", updated_at: new Date().toISOString() })
    .eq("order_id", order.id)
    .eq("status", "reserved");

  return NextResponse.json({
    ok: true,
    orderId: order.id,
    status: "cancelled",
    reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : null,
  });
}
