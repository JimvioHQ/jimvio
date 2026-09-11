import type { SupabaseClient } from "@supabase/supabase-js";
import { availableInventory, calculateSellingPrice, pickPriceRule, type PriceRuleRow } from "../pricing/engine";
import { loadStoreConnector } from "../stores/registry";
import { getSupplierConnector } from "../suppliers/registry";
import { logIntegration } from "../observability/log";

export type SyncJobType =
  | "PRODUCT_IMPORT"
  | "PRODUCT_UPDATE"
  | "INVENTORY_SYNC"
  | "PRICE_SYNC"
  | "ORDER_SYNC"
  | "FULFILLMENT_SYNC"
  | "TRACKING_SYNC"
  | "CONNECTION_TEST";

export async function enqueueSyncJob(
  db: SupabaseClient,
  params: {
    vendorId: string;
    storeId?: string | null;
    supplierCode?: string | null;
    jobType: SyncJobType;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ jobId: string; deduped: boolean }> {
  if (params.idempotencyKey) {
    const { data: existing } = await db
      .from("ds_sync_jobs")
      .select("id")
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();
    if (existing?.id) return { jobId: existing.id, deduped: true };
  }

  // Prevent duplicate concurrent jobs of same type for store
  if (params.storeId) {
    const { data: active } = await db
      .from("ds_sync_jobs")
      .select("id")
      .eq("vendor_id", params.vendorId)
      .eq("store_id", params.storeId)
      .eq("job_type", params.jobType)
      .in("status", ["pending", "running"])
      .maybeSingle();
    if (active?.id) return { jobId: active.id, deduped: true };
  }

  const { data, error } = await db
    .from("ds_sync_jobs")
    .insert({
      vendor_id: params.vendorId,
      store_id: params.storeId ?? null,
      supplier_code: params.supplierCode ?? null,
      job_type: params.jobType,
      status: "pending",
      idempotency_key: params.idempotencyKey ?? null,
      metadata: params.metadata ?? {},
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to enqueue sync job.");
  }
  return { jobId: data.id, deduped: false };
}

function backoffMs(attempts: number): number {
  return Math.min(60 * 60 * 1000, 1000 * Math.pow(2, Math.max(0, attempts)));
}

export async function runSyncJob(
  db: SupabaseClient,
  jobId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: job } = await db.from("ds_sync_jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) return { ok: false, error: "Job not found." };
  if (job.status === "running") return { ok: false, error: "Job already running." };

  await db
    .from("ds_sync_jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      attempts: (job.attempts ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  const { data: run } = await db
    .from("ds_sync_runs")
    .insert({ job_id: jobId, status: "running" })
    .select("id")
    .single();

  try {
    let result: { processed: number; succeeded: number; failed: number };

    switch (job.job_type as SyncJobType) {
      case "INVENTORY_SYNC":
        result = await syncInventoryForStore(db, job.vendor_id, job.store_id);
        break;
      case "PRICE_SYNC":
        result = await syncPricesForStore(db, job.vendor_id, job.store_id);
        break;
      case "CONNECTION_TEST":
        result = await testStoreConnection(db, job.store_id);
        break;
      case "TRACKING_SYNC":
        result = await syncTrackingToStores(db, job.vendor_id, job.store_id);
        break;
      case "FULFILLMENT_SYNC":
        result = await syncFulfillmentJobs(db, job.vendor_id, job.store_id, job.metadata);
        break;
      case "PRODUCT_UPDATE":
      case "PRODUCT_IMPORT":
        // Webhook-driven: refresh inventory/price for mapped products (idempotent).
        // Does not create duplicate Jimvio catalog rows.
        result = await handleProductWebhookSync(db, job.vendor_id, job.store_id, job.metadata);
        break;
      default:
        result = { processed: 0, succeeded: 0, failed: 0 };
    }

    const status =
      result.failed === 0 ? "success" : result.succeeded > 0 ? "partial" : "failed";

    await db
      .from("ds_sync_jobs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        error: result.failed ? `${result.failed} item(s) failed` : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (run?.id) {
      await db
        .from("ds_sync_runs")
        .update({
          status,
          completed_at: new Date().toISOString(),
          items_processed: result.processed,
          items_succeeded: result.succeeded,
          items_failed: result.failed,
        })
        .eq("id", run.id);
    }

    if (job.store_id) {
      await db
        .from("merchant_stores")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: status,
          last_error: result.failed ? `${result.failed} sync item(s) failed` : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.store_id);
    }

    return { ok: status !== "failed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed.";
    const attempts = (job.attempts ?? 0) + 1;
    const retry =
      attempts < (job.max_attempts ?? 5) &&
      !/invalid credentials|not configured|mapping is missing|invalid address/i.test(message);

    await db
      .from("ds_sync_jobs")
      .update({
        status: retry ? "pending" : "failed",
        error: message,
        next_retry_at: retry
          ? new Date(Date.now() + backoffMs(attempts)).toISOString()
          : null,
        completed_at: retry ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (run?.id) {
      await db
        .from("ds_sync_runs")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error: message,
        })
        .eq("id", run.id);
    }

    await logIntegration(db, {
      vendorId: job.vendor_id,
      storeId: job.store_id,
      operation: `sync_${job.job_type}`,
      status: retry ? "retry" : "error",
      jobId,
      message,
    });

    return { ok: false, error: message };
  }
}

async function testStoreConnection(
  db: SupabaseClient,
  storeId: string | null
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!storeId) return { processed: 0, succeeded: 0, failed: 1 };
  const loaded = await loadStoreConnector(db, storeId);
  if (!loaded) return { processed: 1, succeeded: 0, failed: 1 };
  const result = await loaded.connector.testConnection();
  await db
    .from("merchant_stores")
    .update({
      status: result.ok ? "connected" : "error",
      last_error: result.ok ? null : result.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);
  return { processed: 1, succeeded: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 };
}

/**
 * Handle Shopify product webhook jobs without inventing a second catalog sync.
 * Re-pushes inventory/price for mapped store products when present.
 */
async function handleProductWebhookSync(
  db: SupabaseClient,
  vendorId: string,
  storeId: string | null,
  metadata: unknown
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!storeId) return { processed: 0, succeeded: 0, failed: 0 };

  const meta =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {};
  const storeProductId =
    typeof meta.storeProductId === "string" ? meta.storeProductId : null;
  const topic = typeof meta.topic === "string" ? meta.topic : "";

  if (topic === "products/delete" && storeProductId) {
    await db
      .from("store_product_links")
      .update({
        connection_status: "disconnected",
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", storeId)
      .eq("vendor_id", vendorId)
      .eq("store_product_id", storeProductId);
    return { processed: 1, succeeded: 1, failed: 0 };
  }

  // Prefer targeted inventory+price sync for the store (idempotent push)
  const inv = await syncInventoryForStore(db, vendorId, storeId);
  const price = await syncPricesForStore(db, vendorId, storeId);
  return {
    processed: inv.processed + price.processed,
    succeeded: inv.succeeded + price.succeeded,
    failed: inv.failed + price.failed,
  };
}

export async function syncInventoryForStore(
  db: SupabaseClient,
  vendorId: string,
  storeId: string | null
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!storeId) return { processed: 0, succeeded: 0, failed: 0 };

  const { data: links } = await db
    .from("store_product_links")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("store_id", storeId)
    .eq("connection_status", "connected");

  if (!links?.length) return { processed: 0, succeeded: 0, failed: 0 };

  const loaded = await loadStoreConnector(db, storeId);
  if (!loaded) throw new Error("Store connector could not be loaded.");

  const cjVids = links
    .filter((l) => l.supplier_code === "cj" && l.supplier_variant_id)
    .map((l) => l.supplier_variant_id as string);

  const inventoryMap = new Map<string, number>();
  if (cjVids.length) {
    const connector = getSupplierConnector("cj", db);
    const inv = await connector.getInventory(cjVids);
    for (const row of inv) inventoryMap.set(row.supplierVariantId, row.quantity);
  }

  let succeeded = 0;
  let failed = 0;
  const updates: Array<{ storeVariantId: string; quantity: number }> = [];

  for (const link of links) {
    if (!link.store_variant_id) continue;
    let qty: number | null = null;
    if (link.supplier_variant_id && inventoryMap.has(link.supplier_variant_id)) {
      qty = inventoryMap.get(link.supplier_variant_id)!;
    } else if (link.variant_id) {
      const { data: variant } = await db
        .from("product_variants")
        .select("inventory_quantity")
        .eq("id", link.variant_id)
        .maybeSingle();
      qty = variant?.inventory_quantity ?? null;
    }
    if (qty == null) {
      failed += 1;
      continue;
    }
    const available = availableInventory(qty, link.safety_stock ?? 0);
    updates.push({ storeVariantId: link.store_variant_id, quantity: available });

    await db
      .from("store_product_links")
      .update({
        connection_status: available === 0 ? "out_of_stock" : "connected",
        last_inventory_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);
  }

  if (updates.length) {
    await loaded.connector.updateInventory(updates);
    succeeded = updates.length;
  }

  return { processed: links.length, succeeded, failed };
}

export async function syncPricesForStore(
  db: SupabaseClient,
  vendorId: string,
  storeId: string | null
): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (!storeId) return { processed: 0, succeeded: 0, failed: 0 };

  const { data: store } = await db
    .from("merchant_stores")
    .select("sync_preferences")
    .eq("id", storeId)
    .maybeSingle();
  const prefs = (store?.sync_preferences as Record<string, boolean>) || {};
  if (prefs.price === false) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const { data: links } = await db
    .from("store_product_links")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("store_id", storeId);

  const { data: rules } = await db
    .from("ds_price_rules")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("is_active", true);

  const loaded = await loadStoreConnector(db, storeId);
  if (!loaded) throw new Error("Store connector could not be loaded.");

  let succeeded = 0;
  let failed = 0;
  const updates: Array<{ storeVariantId: string; price: number; compareAtPrice?: number | null }> = [];

  for (const link of links ?? []) {
    if (!link.store_variant_id) continue;
    const pricing = (link.pricing as Record<string, unknown>) || {};
    if (pricing.locked === true) continue;

    const rule = pickPriceRule((rules ?? []) as PriceRuleRow[], {
      storeId,
      productId: link.product_id,
      variantId: link.variant_id,
    });

    if (rule?.require_approval) continue;

    const supplierCost = Number(pricing.supplier_cost ?? 0);
    if (!(supplierCost > 0)) {
      failed += 1;
      continue;
    }

    const priced = calculateSellingPrice({
      supplierCost,
      markupType: rule?.markup_type ?? (pricing.markup_type as "percent") ?? "percent",
      markupValue: Number(rule?.markup_value ?? pricing.markup_value ?? 40),
      minProfit: rule?.min_profit,
      maxPrice: rule?.max_price,
      roundingRule: rule?.rounding_rule ?? "none",
      includeShipping: rule?.include_shipping ?? false,
      jimvioMarginPercent: Number(rule?.jimvio_margin_percent ?? 0),
      currency: rule?.currency ?? "USD",
    });

    if (!priced.ok) {
      failed += 1;
      continue;
    }

    updates.push({
      storeVariantId: link.store_variant_id,
      price: priced.sellingPrice,
    });

    await db
      .from("store_product_links")
      .update({
        pricing: { ...pricing, selling_price: priced.sellingPrice },
        last_price_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", link.id);
  }

  if (updates.length) {
    await loaded.connector.updatePrices(updates);
    succeeded = updates.length;
  }

  return { processed: (links ?? []).length, succeeded, failed };
}

async function syncFulfillmentJobs(
  db: SupabaseClient,
  vendorId: string,
  storeId: string | null,
  metadata: unknown
): Promise<{ processed: number; succeeded: number; failed: number }> {
  const meta = (metadata as Record<string, unknown>) || {};
  const { routeOrderFulfillment } = await import("../fulfillment/router");

  if (typeof meta.orderId === "string") {
    const r = await routeOrderFulfillment(db, meta.orderId);
    return {
      processed: 1,
      succeeded: r.ok ? 1 : 0,
      failed: r.ok ? 0 : 1,
    };
  }

  let query = db
    .from("orders")
    .select("id")
    .eq("vendor_id", vendorId)
    .not("merchant_store_id", "is", null)
    .is("cj_order_id", null)
    .or("fulfillment_status_normalized.eq.pending,fulfillment_status_normalized.is.null")
    .limit(20);

  if (storeId) query = query.eq("merchant_store_id", storeId);

  const { data: orders } = await query;
  let succeeded = 0;
  let failed = 0;
  for (const order of orders ?? []) {
    const r = await routeOrderFulfillment(db, order.id);
    if (r.ok) succeeded += 1;
    else failed += 1;
  }

  const tracking = await syncTrackingToStores(db, vendorId, storeId);
  return {
    processed: (orders ?? []).length + tracking.processed,
    succeeded: succeeded + tracking.succeeded,
    failed: failed + tracking.failed,
  };
}

async function syncTrackingToStores(
  db: SupabaseClient,
  vendorId: string,
  storeId: string | null
): Promise<{ processed: number; succeeded: number; failed: number }> {
  let query = db
    .from("orders")
    .select("id, merchant_store_id, external_order_id, tracking_number, tracking_status, order_channel")
    .eq("vendor_id", vendorId)
    .not("tracking_number", "is", null)
    .not("external_order_id", "is", null)
    .not("merchant_store_id", "is", null)
    .limit(50);

  if (storeId) query = query.eq("merchant_store_id", storeId);

  const { data: orders } = await query;
  let succeeded = 0;
  let failed = 0;

  for (const order of orders ?? []) {
    try {
      const loaded = await loadStoreConnector(db, order.merchant_store_id!);
      if (!loaded) {
        failed += 1;
        continue;
      }
      await loaded.connector.createFulfillment({
        externalOrderId: order.external_order_id!,
        trackingNumber: order.tracking_number,
        notifyCustomer: true,
      });
      await db
        .from("orders")
        .update({
          fulfillment_status_normalized: "shipped",
          shopify_fulfillment_status: "fulfilled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed: (orders ?? []).length, succeeded, failed };
}
