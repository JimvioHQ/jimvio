import { NextRequest, NextResponse } from "next/server";
import { dsAdminDb } from "@/lib/dropshipping/tenant";
import {
  verifyShopifyWebhookHmac,
  persistWebhookEvent,
  markWebhookProcessed,
} from "@/lib/dropshipping/webhooks/verify";
import { ingestStoreOrder } from "@/lib/dropshipping/orders/ingest";
import { ShopifyStoreConnector } from "@/lib/dropshipping/stores/shopify-connector";
import { getShopifyApiVersionFromEnv } from "@/lib/platform-shopify";
import { enqueueSyncJob } from "@/lib/dropshipping/sync/engine";
import {
  handleShopifyComplianceTopic,
  isShopifyComplianceTopic,
} from "@/lib/dropshipping/stores/shopify-compliance";

export const dynamic = "force-dynamic";

/**
 * Jimvio Commerce inbound Shopify webhooks.
 * Handles orders/*, products/*, app/uninstalled, and App Store compliance topics.
 * Does NOT replace /api/webhooks/shopify (fulfillment earnings path).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic") || "";
  const shopDomain = (req.headers.get("x-shopify-shop-domain") || "").toLowerCase();
  const webhookId = req.headers.get("x-shopify-webhook-id") || "";

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const db = dsAdminDb();
  const compliance = isShopifyComplianceTopic(topic);
  const idempotencyKey =
    webhookId ||
    `shopify_ds:${shopDomain}:${topic}:${String(payload.id ?? payload.shop_id ?? "")}:${payload.updated_at ?? payload.created_at ?? ""}`;

  // Compliance (esp. shop/redact) may arrive after uninstall — include disconnected stores.
  let storeQuery = shopDomain
    ? db
        .from("merchant_stores")
        .select("id, vendor_id, status, platform")
        .eq("platform", "shopify")
        .ilike("domain", shopDomain)
    : null;
  if (storeQuery && !compliance) {
    storeQuery = storeQuery.neq("status", "disconnected");
  }
  const { data: store } = storeQuery
    ? await storeQuery.maybeSingle()
    : { data: null };

  const persisted = await persistWebhookEvent(db, {
    provider: "shopify_dropshipping",
    idempotencyKey,
    payload,
    merchantStoreId: store?.id ?? null,
    topic,
  });

  if (!persisted.ok) {
    // Fast ack so Shopify retries; log failure via event insert error
    return NextResponse.json({ received: true, deferred: true });
  }

  if (persisted.alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Fast-ack path: process synchronously but keep work bounded; always 200 after verify
  try {
    if (compliance) {
      const result = await handleShopifyComplianceTopic(
        db,
        topic,
        shopDomain,
        payload
      );
      await markWebhookProcessed(db, persisted.eventId, {
        status: result.ok ? "processed" : "failed",
        error: result.ok ? undefined : result.action,
      });
      return NextResponse.json({ received: true, compliance: result });
    }

    if (["orders/create", "orders/updated", "orders/paid", "orders/cancelled"].includes(topic)) {
      if (!store?.id || !store.vendor_id) {
        await markWebhookProcessed(db, persisted.eventId, {
          error: "No connected merchant store for this shop domain.",
          status: "skipped",
        });
        return NextResponse.json({ received: true, skipped: true });
      }

      const connector = new ShopifyStoreConnector({
        shopDomain,
        accessToken: "unused",
        apiVersion: getShopifyApiVersionFromEnv(),
      });
      const normalized = connector.normalizeOrder(payload);
      const ingest = await ingestStoreOrder(db, {
        vendorId: store.vendor_id,
        storeId: store.id,
        orderChannel: "shopify",
        normalized,
        idempotencyKey: `shopify:${idempotencyKey}`,
      });

      if (ingest.ok) {
        await markWebhookProcessed(db, persisted.eventId, {
          orderId: ingest.orderId,
          status: "processed",
        });
        // Only a verified captured payment may trigger CJ supplier fulfillment.
        // orders/paid and orders/updated can arrive after the initial orders/create event.
        if (normalized.paymentStatus === "paid") {
          let routeResult:
            | { ok: true }
            | { ok: false; code?: string }
            | null = null;
          try {
            const { routeOrderFulfillment } = await import(
              "@/lib/dropshipping/fulfillment/router"
            );
            routeResult = await routeOrderFulfillment(db, ingest.orderId);
          } catch {
            // A transient route failure is retried by the sync queue below.
          }

          // Do not enqueue cancelled/refunded or otherwise payment-blocked orders.
          if (!routeResult?.ok && routeResult?.code !== "PAYMENT_NOT_CONFIRMED") {
            await enqueueSyncJob(db, {
              vendorId: store.vendor_id,
              storeId: store.id,
              jobType: "FULFILLMENT_SYNC",
              metadata: { orderId: ingest.orderId, reason: topic },
            });
          }
        }
      } else {
        await markWebhookProcessed(db, persisted.eventId, {
          error: ingest.error,
          status: "failed",
        });
      }
      return NextResponse.json({ received: true, ingest });
    }

    if (topic === "app/uninstalled") {
      if (store?.id) {
        await db
          .from("merchant_stores")
          .update({
            status: "disconnected",
            disconnected_at: new Date().toISOString(),
            last_error: "Shopify app uninstalled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", store.id);
        await db
          .from("merchant_store_credentials")
          .update({
            access_token_encrypted: null,
            updated_at: new Date().toISOString(),
          })
          .eq("store_id", store.id);
      }
      await markWebhookProcessed(db, persisted.eventId, { status: "processed" });
      return NextResponse.json({ received: true, uninstalled: true });
    }

    if (topic === "products/create" || topic === "products/update" || topic === "products/delete") {
      if (store?.id && store.vendor_id) {
        await enqueueSyncJob(db, {
          vendorId: store.vendor_id,
          storeId: store.id,
          jobType: "PRODUCT_UPDATE",
          metadata: {
            topic,
            storeProductId: payload.id != null ? String(payload.id) : null,
            source: "webhook",
          },
        });
      }
      await markWebhookProcessed(db, persisted.eventId, { status: "processed" });
      return NextResponse.json({ received: true, queued: true });
    }

    await markWebhookProcessed(db, persisted.eventId, {
      status: "skipped",
      error: `Unhandled topic: ${topic}`,
    });
    return NextResponse.json({ received: true, skipped: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed.";
    await markWebhookProcessed(db, persisted.eventId, {
      error: message,
      status: "failed",
    });
    // Still ack — Shopify will not retry endlessly on 5xx for already-persisted events
    return NextResponse.json({ received: true, error: message });
  }
}
