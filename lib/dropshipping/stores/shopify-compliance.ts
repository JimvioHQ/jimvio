import type { SupabaseClient } from "@supabase/supabase-js";
import { logIntegration } from "../observability/log";
import { disconnectShopifyStore } from "./connect-shopify";

export { isShopifyComplianceTopic } from "./shopify-compliance-topics";
export type { ShopifyComplianceTopic } from "./shopify-compliance-topics";

/**
 * Shopify App Store mandatory compliance webhook handlers.
 * Topics: customers/data_request, customers/redact, shop/redact
 *
 * These acknowledge GDPR/privacy obligations. Processing is bounded and
 * never logs secrets or full credential material.
 */

export type ComplianceResult = {
  ok: boolean;
  action: string;
  details?: Record<string, unknown>;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

async function findShopifyStore(
  db: SupabaseClient,
  shopDomain: string
): Promise<{ id: string; vendor_id: string } | null> {
  if (!shopDomain) return null;
  const { data } = await db
    .from("merchant_stores")
    .select("id, vendor_id")
    .eq("platform", "shopify")
    .ilike("domain", shopDomain)
    .maybeSingle();
  return data?.id && data.vendor_id
    ? { id: data.id, vendor_id: data.vendor_id }
    : null;
}

/**
 * customers/data_request — merchant/customer asked what data we hold.
 * We log the request for support export; do not email PII automatically.
 */
export async function handleCustomersDataRequest(
  db: SupabaseClient,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<ComplianceResult> {
  const store = await findShopifyStore(db, shopDomain);
  const customer = asRecord(payload.customer);
  const dataRequest = asRecord(payload.data_request);
  const ordersRequested = Array.isArray(payload.orders_requested)
    ? payload.orders_requested.map(String)
    : [];

  await logIntegration(db, {
    vendorId: store?.vendor_id ?? null,
    storeId: store?.id ?? null,
    supplierCode: null,
    operation: "shopify_compliance_data_request",
    status: "success",
    metadata: {
      shop_id: payload.shop_id ?? null,
      shop_domain: shopDomain,
      customer_id: customer.id ?? null,
      orders_requested_count: ordersRequested.length,
      data_request_id: dataRequest.id ?? payload.data_request_id ?? null,
    },
  });

  return {
    ok: true,
    action: "data_request_logged",
    details: {
      storeId: store?.id ?? null,
      ordersRequested: ordersRequested.length,
    },
  };
}

/**
 * customers/redact — delete/redact customer personal data for this shop.
 */
export async function handleCustomersRedact(
  db: SupabaseClient,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<ComplianceResult> {
  const store = await findShopifyStore(db, shopDomain);
  if (!store) {
    return { ok: true, action: "no_store", details: { shopDomain } };
  }

  const customer = asRecord(payload.customer);
  const email = String(customer.email || "").trim().toLowerCase();
  const phone = String(customer.phone || "").trim();
  const orderIds = Array.isArray(payload.orders_to_redact)
    ? payload.orders_to_redact.map(String)
    : [];

  let query = db
    .from("orders")
    .select("id, shipping_address, billing_address, metadata, external_order_id")
    .eq("merchant_store_id", store.id)
    .limit(200);

  if (orderIds.length) {
    query = query.in("external_order_id", orderIds);
  }

  const { data: orders } = await query;
  let redacted = 0;

  for (const order of orders ?? []) {
    const meta = asRecord(order.metadata);
    const ship = asRecord(order.shipping_address);
    const bill = asRecord(order.billing_address);
    const metaEmail = String(meta.customer_email || "").toLowerCase();
    const metaPhone = String(meta.customer_phone || "");
    const extId = String(order.external_order_id || "");

    const match =
      orderIds.length > 0
        ? orderIds.includes(extId)
        : (Boolean(email) && metaEmail === email) ||
          (Boolean(phone) && metaPhone === phone);

    if (!match) continue;

    await db
      .from("orders")
      .update({
        shipping_address: redactAddress(ship),
        billing_address: redactAddress(bill),
        metadata: {
          ...meta,
          customer_email: meta.customer_email ? "[redacted]" : meta.customer_email,
          customer_phone: meta.customer_phone ? "[redacted]" : meta.customer_phone,
          shopify_customer_redacted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    redacted += 1;
  }

  await logIntegration(db, {
    vendorId: store.vendor_id,
    storeId: store.id,
    supplierCode: null,
    operation: "shopify_compliance_customers_redact",
    status: "success",
    metadata: {
      shop_domain: shopDomain,
      customer_id: customer.id ?? null,
      orders_redacted: redacted,
    },
  });

  return { ok: true, action: "customers_redacted", details: { redacted } };
}

/**
 * shop/redact — 48h after uninstall; erase shop-linked personal data.
 */
export async function handleShopRedact(
  db: SupabaseClient,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<ComplianceResult> {
  const store = await findShopifyStore(db, shopDomain);
  if (!store) {
    return { ok: true, action: "no_store", details: { shopDomain } };
  }

  // Disconnect + wipe credentials (idempotent)
  await disconnectShopifyStore(db, store.id, store.vendor_id).catch(() => null);

  const { data: orders } = await db
    .from("orders")
    .select("id, shipping_address, billing_address, metadata")
    .eq("merchant_store_id", store.id)
    .limit(500);

  let redacted = 0;
  for (const order of orders ?? []) {
    const meta = asRecord(order.metadata);
    await db
      .from("orders")
      .update({
        shipping_address: redactAddress(asRecord(order.shipping_address)),
        billing_address: redactAddress(asRecord(order.billing_address)),
        metadata: {
          ...meta,
          customer_email: meta.customer_email ? "[redacted]" : null,
          customer_phone: meta.customer_phone ? "[redacted]" : null,
          shopify_shop_redacted_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    redacted += 1;
  }

  await logIntegration(db, {
    vendorId: store.vendor_id,
    storeId: store.id,
    supplierCode: null,
    operation: "shopify_compliance_shop_redact",
    status: "success",
    metadata: {
      shop_id: payload.shop_id ?? null,
      shop_domain: shopDomain,
      orders_redacted: redacted,
    },
  });

  return { ok: true, action: "shop_redacted", details: { redacted } };
}

function redactAddress(addr: Record<string, unknown>): Record<string, unknown> {
  if (!Object.keys(addr).length) return addr;
  return {
    ...addr,
    name: addr.name ? "[redacted]" : addr.name,
    first_name: addr.first_name ? "[redacted]" : addr.first_name,
    last_name: addr.last_name ? "[redacted]" : addr.last_name,
    phone: addr.phone ? "[redacted]" : addr.phone,
    email: addr.email ? "[redacted]" : addr.email,
    address1: addr.address1 ? "[redacted]" : addr.address1,
    address2: addr.address2 ? "[redacted]" : addr.address2,
    company: addr.company ? "[redacted]" : addr.company,
  };
}

export async function handleShopifyComplianceTopic(
  db: SupabaseClient,
  topic: string,
  shopDomain: string,
  payload: Record<string, unknown>
): Promise<ComplianceResult> {
  switch (topic) {
    case "customers/data_request":
      return handleCustomersDataRequest(db, shopDomain, payload);
    case "customers/redact":
      return handleCustomersRedact(db, shopDomain, payload);
    case "shop/redact":
      return handleShopRedact(db, shopDomain, payload);
    default:
      return { ok: false, action: "unknown_topic" };
  }
}
