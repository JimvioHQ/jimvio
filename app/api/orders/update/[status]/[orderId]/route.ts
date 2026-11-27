import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseSecretKey, getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/service-role";
import { isOrderPaymentComplete } from "@/lib/payments/order-payment-utils";
import { restockOrderInventory } from "@/lib/actions/inventory-management";
import { advanceOrderFulfillment } from "@/lib/order-fulfillment/advance-order-status";

const VALID_ORDER_STATUSES = [
  "pending", "confirmed", "processing", "shipped", "delivered",
  "cancelled", "refunded", "completed",
] as const;
const VENDOR_ONLY_STATUSES = ["processing", "shipped", "delivered"] as const;
const BUYER_ALLOWED_STATUSES = ["cancelled"] as const;
const ADMIN_ONLY_STATUSES = ["refunded", "completed"] as const;
type OrderStatus = (typeof VALID_ORDER_STATUSES)[number];

function getServiceSupabase() {
  return createClient(
    getSupabaseUrl(),
    getSupabaseSecretKey(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ status: string; orderId: string }> }
) {
  const { status, orderId } = await params;
  if (!orderId || typeof orderId !== "string") {
    return NextResponse.json({ error: "Missing or invalid orderId" }, { status: 400 });
  }
  if (!VALID_ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_ORDER_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return NextResponse.json({ error: "Failed to read session cookies" }, { status: 500 });
  }

  const userSupabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { tracking_number?: string; tracking_url?: string } = {};
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const serviceSupabase = getServiceSupabase();
  const { data: existingOrder, error: fetchError } = await serviceSupabase
    .from("orders")
    .select("id, status, payment_status, buyer_id, order_items(vendor_id)")
    .eq("id", orderId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    console.error("[orders/update] Fetch error:", fetchError);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
  if (!existingOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const isBuyer = existingOrder.buyer_id === user.id;
  const { data: userVendors, error: vendorLookupError } = await serviceSupabase
    .from("vendors")
    .select("id")
    .eq("user_id", user.id);
  if (vendorLookupError) {
    return NextResponse.json({ error: "Unable to verify vendor access" }, { status: 500 });
  }
  const vendorIds = new Set((userVendors ?? []).map((vendor) => vendor.id));
  const isVendor = (existingOrder.order_items ?? []).some(
    (item: { vendor_id: string | null }) => item.vendor_id != null && vendorIds.has(item.vendor_id)
  );
  if (!isBuyer && !isVendor) {
    return NextResponse.json({ error: "Order not found or unauthorized" }, { status: 404 });
  }

  const currentStatus = String(existingOrder.status ?? "pending").toLowerCase();
  const terminalStatuses = ["delivered", "cancelled", "refunded", "completed"];
  if (terminalStatuses.includes(currentStatus)) {
    return NextResponse.json(
      { error: `Cannot update a ${currentStatus} order` },
      { status: 409 }
    );
  }

  if (ADMIN_ONLY_STATUSES.includes(status as (typeof ADMIN_ONLY_STATUSES)[number])) {
    return NextResponse.json(
      { error: "This status must be applied by the system, support, or payment provider" },
      { status: 403 }
    );
  }

  if (isVendor && status !== "cancelled" &&
      !VENDOR_ONLY_STATUSES.includes(status as (typeof VENDOR_ONLY_STATUSES)[number])) {
    return NextResponse.json(
      { error: "Vendors may only update fulfillment to processing, shipped, or delivered" },
      { status: 403 }
    );
  }
  if (isVendor && status === "cancelled" && !["confirmed", "processing"].includes(currentStatus)) {
    return NextResponse.json(
      { error: `Cannot cancel an order from '${currentStatus}'` },
      { status: 409 }
    );
  }

  if (VENDOR_ONLY_STATUSES.includes(status as (typeof VENDOR_ONLY_STATUSES)[number])) {
    if (!isVendor) {
      return NextResponse.json({ error: `Status '${status}' can only be set by the vendor` }, { status: 403 });
    }
    if (!isOrderPaymentComplete(existingOrder.payment_status)) {
      return NextResponse.json({ error: "Order must be paid before fulfillment updates" }, { status: 409 });
    }
    const allowed: Record<string, string[]> = {
      confirmed: ["processing", "shipped"],
      processing: ["shipped"],
      shipped: ["delivered"],
    };
    if (!(allowed[currentStatus] ?? []).includes(status)) {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' to '${status}'` },
        { status: 409 }
      );
    }
  }

  if (isBuyer && !isVendor) {
    if (!BUYER_ALLOWED_STATUSES.includes(status as (typeof BUYER_ALLOWED_STATUSES)[number])) {
      return NextResponse.json({ error: "Buyers may only cancel unpaid pending orders" }, { status: 403 });
    }
    if (isOrderPaymentComplete(existingOrder.payment_status) || currentStatus !== "pending") {
      return NextResponse.json(
        { error: "Only pending unpaid orders can be cancelled by the buyer" },
        { status: 409 }
      );
    }
  }

  if (status === "cancelled" && isVendor && isOrderPaymentComplete(existingOrder.payment_status)) {
    return NextResponse.json(
      { error: "Paid orders must go through the refund/support process before cancellation" },
      { status: 409 }
    );
  }
  if (status === "cancelled" && !isBuyer && !isVendor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const trackingNumber = body.tracking_number?.trim() || "";
  const trackingUrl = body.tracking_url?.trim() || "";
  if (status === "shipped" && !trackingNumber) {
    return NextResponse.json(
      { error: "A tracking number is required before marking an order as shipped" },
      { status: 422 }
    );
  }

  const result = await advanceOrderFulfillment(serviceSupabase, orderId, {
    newStatus: status as "processing" | "shipped" | "delivered" | "cancelled",
    trackingNumber: status === "shipped" ? trackingNumber : undefined,
    trackingUrl: trackingUrl || undefined,
    trackingStatus:
      status === "shipped" ? "In transit" :
      status === "delivered" ? "Delivered" : undefined,
    notes: isBuyer
      ? "Buyer cancelled an unpaid pending order."
      : `Vendor updated order status to ${status}.`,
    metadata: {
      source: isBuyer ? "buyer_order_action" : "vendor_fulfillment",
      actor_user_id: user.id,
    },
  });

  if (!result.updated || result.status !== status) {
    return NextResponse.json({ error: "Order status could not be updated" }, { status: 409 });
  }

  if (status === "cancelled" && isVendor) {
    const restock = await restockOrderInventory(orderId);
    if (!restock.success) {
      console.warn("[orders/update] restock failed (non-fatal):", restock.error);
    }
  }

  return NextResponse.json({
    status: "success",
    orderId,
    orderStatus: result.status,
    paymentStatus: existingOrder.payment_status,
  });
}
