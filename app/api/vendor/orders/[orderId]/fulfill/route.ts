/**
 * Vendor fulfillment endpoint. All state changes go through the shared order
 * lifecycle so timestamps, history, tracking and buyer notifications stay in sync.
 *
 * PATCH /api/vendor/orders/:orderId/fulfill
 * Body: { status: "shipped" | "delivered", tracking_number?: string, tracking_url?: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import {
  getSupabaseSecretKey,
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  confirmed: ["shipped"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

const adminDb = createClient(
  getSupabaseUrl(),
  getSupabaseSecretKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const cookieStore = await cookies();
  const authDb = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await authDb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { data: order, error: orderError } = await adminDb
    .from("orders")
    .select("id, status, payment_status, buyer_id, order_number, tracking_number, order_items(vendor_id)")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!isOrderPaymentComplete(order.payment_status)) {
    return NextResponse.json(
      { error: "Cannot fulfill an unpaid order" },
      { status: 422 }
    );
  }

  const { data: vendors, error: vendorError } = await adminDb
    .from("vendors")
    .select("id")
    .eq("user_id", user.id);

  if (vendorError) {
    return NextResponse.json({ error: "Unable to verify vendor access" }, { status: 500 });
  }
  const vendorIds = new Set((vendors ?? []).map((vendor) => vendor.id));
  if (vendorIds.size === 0) {
    return NextResponse.json({ error: "Not a vendor account" }, { status: 403 });
  }

  const ownsItem = (order.order_items ?? []).some(
    (item: { vendor_id: string | null }) => item.vendor_id != null && vendorIds.has(item.vendor_id)
  );
  if (!ownsItem) {
    return NextResponse.json({ error: "You have no items in this order" }, { status: 403 });
  }

  const currentStatus = String(order.status ?? "").toLowerCase();
  if (!(ALLOWED_TRANSITIONS[currentStatus] ?? []).includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStatus}' to '${newStatus}'` },
      { status: 422 }
    );
  }

  const trackingNumber = body.tracking_number?.trim() || "";
  const trackingUrl = body.tracking_url?.trim() || "";
  if (newStatus === "shipped" && !trackingNumber) {
    return NextResponse.json(
      { error: "A tracking number is required before marking the order as shipped" },
      { status: 422 }
    );
  }

  const result = await advanceOrderFulfillment(adminDb, orderId, {
    newStatus: newStatus as "shipped" | "delivered",
    trackingNumber: newStatus === "shipped" ? trackingNumber : undefined,
    trackingUrl: trackingUrl || undefined,
    trackingStatus: newStatus === "shipped" ? "In transit" : "Delivered",
    notes: newStatus === "shipped"
      ? "Vendor marked the order as shipped."
      : "Vendor confirmed the order was delivered.",
    metadata: {
      source: "vendor_fulfillment",
      vendor_user_id: user.id,
    },
  });

  if (!result.updated || result.status !== newStatus) {
    return NextResponse.json(
      { error: "Order status could not be updated. Refresh the order and try again." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    orderId,
    status: result.status,
    tracking_number: newStatus === "shipped" ? trackingNumber : order.tracking_number ?? null,
  });
}
