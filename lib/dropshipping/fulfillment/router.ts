import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupplierConnector } from "../suppliers/registry";
import type { NormalizedFulfillmentStatus, SupplierCode } from "../suppliers/types";
import { claimIdempotency, completeIdempotency } from "../api/idempotency";
import { logIntegration } from "../observability/log";
import { usableCjVid } from "@/lib/cj/variant-vid";

export type RouteFulfillmentResult =
  | {
      ok: true;
      supplierCode: SupplierCode;
      supplierOrderId: string;
      status: NormalizedFulfillmentStatus;
    }
  | { ok: false; error: string; code: string };

/**
 * Fulfillment Router: determine supplier from line mappings, check inventory,
 * create supplier order. Reuses CJ submit path via CjSupplierConnector.
 */
export async function routeOrderFulfillment(
  db: SupabaseClient,
  orderId: string
): Promise<RouteFulfillmentResult> {
  const started = Date.now();
  const scope = "fulfillment_route";
  const idemKey = `fulfill:${orderId}`;

  const claim = await claimIdempotency(db, {
    vendorId: null,
    scope,
    idempotencyKey: idemKey,
  });
  if (claim.hit && claim.responseBody) {
    return claim.responseBody as RouteFulfillmentResult;
  }

  const { data: order } = await db
    .from("orders")
    .select(
      "id, order_number, vendor_id, merchant_store_id, cj_order_id, cj_shipping_method, shipping_address, currency, fulfillment_status_normalized"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false, error: "Order not found.", code: "ORDER_NOT_FOUND" };
  }

  if (order.cj_order_id) {
    const result: RouteFulfillmentResult = {
      ok: true,
      supplierCode: "cj",
      supplierOrderId: order.cj_order_id,
      status: "submitted",
    };
    await completeIdempotency(db, scope, idemKey, 200, result);
    return result;
  }

  const { data: items } = await db
    .from("order_items")
    .select("id, product_id, product_source, source_metadata, quantity, unit_price")
    .eq("order_id", orderId);

  if (!items?.length) {
    return { ok: false, error: "Order has no line items.", code: "NO_ITEMS" };
  }

  // Group by supplier — currently CJ is primary for dropship OS
  const cjLines = items.filter((i) => {
    const src = (i.product_source || "").toLowerCase();
    const meta = (i.source_metadata as Record<string, unknown>) || {};
    return src === "cj" || Boolean(usableCjVid(meta.cj_vid) || usableCjVid(meta.vid));
  });

  if (!cjLines.length) {
    const result: RouteFulfillmentResult = {
      ok: false,
      error: "No supplier-routable lines found for this order.",
      code: "NO_SUPPLIER_LINES",
    };
    await completeIdempotency(db, scope, idemKey, 422, result);
    return result;
  }

  const addr = (order.shipping_address as Record<string, unknown>) || {};
  const countryCode = String(
    addr.country_code || addr.countryCode || addr.country || ""
  ).toUpperCase();

  if (!countryCode || countryCode.length !== 2) {
    const result: RouteFulfillmentResult = {
      ok: false,
      error: "Shipping destination country is missing or invalid.",
      code: "INVALID_ADDRESS",
    };
    await completeIdempotency(db, scope, idemKey, 422, result);
    return result;
  }

  const connector = getSupplierConnector("cj", db);

  const supplierLines = cjLines.map((line) => {
    const meta = (line.source_metadata as Record<string, unknown>) || {};
    const vid =
      usableCjVid(meta.cj_vid) ||
      usableCjVid(meta.vid) ||
      usableCjVid(meta.supplier_variant_id);
    return {
      supplierVariantId: vid || "",
      quantity: line.quantity,
      unitPrice: Number(line.unit_price),
    };
  });

  if (supplierLines.some((l) => !l.supplierVariantId)) {
    const result: RouteFulfillmentResult = {
      ok: false,
      error: "Product variant mapping is missing for supplier fulfillment.",
      code: "MISSING_VARIANT_MAPPING",
    };
    await completeIdempotency(db, scope, idemKey, 422, result);
    return result;
  }

  // Inventory check (real CJ inventory when available)
  try {
    const inventory = await connector.getInventory(
      supplierLines.map((l) => l.supplierVariantId)
    );
    for (const line of supplierLines) {
      const inv = inventory.find((i) => i.supplierVariantId === line.supplierVariantId);
      if (inv && inv.quantity < line.quantity) {
        const result: RouteFulfillmentResult = {
          ok: false,
          error: `Supplier inventory insufficient for variant ${line.supplierVariantId}.`,
          code: "INSUFFICIENT_INVENTORY",
        };
        await completeIdempotency(db, scope, idemKey, 409, result);
        return result;
      }
    }
  } catch {
    // If inventory temporarily unavailable, continue with existing submit path
    // (checkout already validated); do not fabricate stock.
  }

  try {
    const created = await connector.createOrder({
      idempotencyKey: idemKey,
      jimvioOrderId: order.id,
      jimvioOrderNumber: order.order_number,
      lines: supplierLines,
      shippingAddress: {
        fullName: String(addr.name || addr.full_name || "Customer"),
        phone: (addr.phone as string) ?? null,
        email: (addr.email as string) ?? null,
        countryCode,
        state: (addr.province || addr.state || null) as string | null,
        city: (addr.city as string) ?? null,
        postalCode: (addr.zip || addr.postal_code || null) as string | null,
        address1: String(addr.address1 || addr.line1 || ""),
        address2: (addr.address2 || addr.line2 || null) as string | null,
      },
      shippingMethod: order.cj_shipping_method,
      currency: order.currency,
    });

    await db
      .from("orders")
      .update({
        fulfillment_status_normalized: "submitted",
        cj_fulfillment_status: created.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    const result: RouteFulfillmentResult = {
      ok: true,
      supplierCode: "cj",
      supplierOrderId: created.supplierOrderId,
      status: "submitted",
    };

    await logIntegration(db, {
      vendorId: order.vendor_id,
      storeId: order.merchant_store_id,
      supplierCode: "cj",
      operation: "fulfillment_route",
      status: "success",
      durationMs: Date.now() - started,
      externalId: created.supplierOrderId,
      metadata: { orderId },
    });
    await completeIdempotency(db, scope, idemKey, 200, result);
    return result;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Order could not be submitted to the supplier.";
    const result: RouteFulfillmentResult = {
      ok: false,
      error: message,
      code: "SUPPLIER_SUBMIT_FAILED",
    };
    await logIntegration(db, {
      vendorId: order.vendor_id,
      storeId: order.merchant_store_id,
      supplierCode: "cj",
      operation: "fulfillment_route",
      status: "error",
      errorCode: "SUPPLIER_SUBMIT_FAILED",
      message,
      durationMs: Date.now() - started,
      metadata: { orderId },
    });
    await completeIdempotency(db, scope, idemKey, 502, result);
    return result;
  }
}

export function normalizeTrackingStatus(raw: string | null | undefined): NormalizedFulfillmentStatus {
  const s = (raw || "").toLowerCase();
  if (s.includes("deliver")) return "delivered";
  if (s.includes("transit") || s.includes("ship")) return s.includes("transit") ? "in_transit" : "shipped";
  if (s.includes("cancel")) return "cancelled";
  if (s.includes("fail")) return "failed";
  if (s.includes("return")) return "returned";
  if (s.includes("process")) return "processing";
  if (s.includes("submit")) return "submitted";
  return "pending";
}
