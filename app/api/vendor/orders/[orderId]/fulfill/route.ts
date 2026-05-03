/**
 * app/api/vendor/orders/[orderId]/fulfill/route.ts
 *
 * Vendor fulfillment endpoint — lets vendors update physical order status.
 * Physical products are NEVER auto-fulfilled; vendors control this manually.
 *
 * PATCH /api/vendor/orders/:orderId/fulfill
 * Body: { status: "shipped" | "delivered", tracking_number?: string, tracking_url?: string }
 *
 * Rules:
 *  - Caller must be authenticated as a vendor who owns an item in this order
 *  - Order must be payment_status = 'completed' before allowing fulfillment
 *  - Status transitions: confirmed → shipped → delivered  (no backward movement)
 *  - Sends notification to buyer on transition
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["shipped"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

const adminDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  // --- Auth: get calling user from session ---
  const cookieStore = await cookies();
  const authDb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await authDb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;

  let body: { status?: string; tracking_number?: string; tracking_url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newStatus = body.status?.trim().toLowerCase();
  if (!newStatus || !["shipped", "delivered"].includes(newStatus)) {
    return NextResponse.json(
      { error: "status must be 'shipped' or 'delivered'" },
      { status: 400 }
    );
  }

  // --- Load order ---
  const { data: order } = await adminDb
    .from("orders")
    .select("id, status, payment_status, buyer_id, order_number, order_items(vendor_id)")
    .eq("id", orderId)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // --- Payment guard: must be paid ---
  if (order.payment_status !== "completed") {
    return NextResponse.json(
      { error: "Cannot fulfill an unpaid order" },
      { status: 422 }
    );
  }

  // --- Vendor ownership check ---
  const { data: vendor } = await adminDb
    .from("vendors")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json({ error: "Not a vendor account" }, { status: 403 });
  }

  type OrderItem = { vendor_id: string };
  const items = (order.order_items ?? []) as OrderItem[];
  const ownsItem = items.some((i) => i.vendor_id === vendor.id);
  if (!ownsItem) {
    return NextResponse.json(
      { error: "You have no items in this order" },
      { status: 403 }
    );
  }

  // --- Status transition guard ---
  const allowedNext = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowedNext.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from '${order.status}' to '${newStatus}'` },
      { status: 422 }
    );
  }

  // --- Apply update ---
  const patch: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === "shipped") {
    patch.shipped_at = new Date().toISOString();
    if (body.tracking_number) patch.tracking_number = body.tracking_number;
    if (body.tracking_url) patch.tracking_url = body.tracking_url;
  }
  if (newStatus === "delivered") {
    patch.delivered_at = new Date().toISOString();
  }

  const { error: updateErr } = await adminDb
    .from("orders")
    .update(patch)
    .eq("id", orderId);

  if (updateErr) {
    console.error("[fulfill] update failed", updateErr);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }

  // --- Notify buyer ---
  const messages: Record<string, string> = {
    shipped: `Your order #${order.order_number} has been shipped!${body.tracking_number ? ` Tracking: ${body.tracking_number}` : ""}`,
    delivered: `Your order #${order.order_number} has been delivered. Enjoy!`,
  };

  if (order.buyer_id) {
    await adminDb.from("notifications").insert({
      user_id: order.buyer_id,
      type: "order",
      title: newStatus === "shipped" ? "Order Shipped 📦" : "Order Delivered ✅",
      message: messages[newStatus],
      data: {
        order_id: orderId,
        status: newStatus,
        tracking_number: body.tracking_number ?? null,
        tracking_url: body.tracking_url ?? null,
      },
      action_url: `/dashboard/orders/${orderId}`,
    });
  }

  console.log(`[fulfill] ✓ Order ${orderId} → ${newStatus} by vendor ${vendor.id}`);

  return NextResponse.json({
    success: true,
    orderId,
    status: newStatus,
    tracking_number: body.tracking_number ?? null,
  });
}
