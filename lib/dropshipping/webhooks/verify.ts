import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shopify webhook HMAC verification.
 * Matches app/api/webhooks/shopify/route.ts — secret is SHOPIFY_WEBHOOK_SECRET
 * (app client secret from Dev Dashboard → Credentials).
 */
export function verifyShopifyWebhookHmac(
  rawBody: string,
  hmacHeader: string | null,
  clientSecret?: string
): boolean {
  const secret =
    clientSecret ??
    process.env.SHOPIFY_WEBHOOK_SECRET?.trim() ??
    process.env.SHOPIFY_CLIENT_SECRET?.trim() ??
    "";
  if (!secret || !hmacHeader) return false;
  try {
    const calculatedB64 = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");
    const a = Buffer.from(calculatedB64, "base64");
    const b = Buffer.from(hmacHeader, "base64");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type PersistWebhookResult =
  | { ok: true; eventId: string; duplicate: boolean; alreadyProcessed: boolean }
  | { ok: false; error: string };

/**
 * Persist inbound webhook with idempotency on (provider, idempotency_key).
 * Returns duplicate=true when the same delivery was already stored.
 */
export async function persistWebhookEvent(
  db: SupabaseClient,
  params: {
    provider: string;
    idempotencyKey: string;
    payload: unknown;
    merchantStoreId?: string | null;
    topic?: string | null;
  }
): Promise<PersistWebhookResult> {
  const { data: existing } = await db
    .from("webhook_events")
    .select("id, status, processing_status")
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existing?.id) {
    const processed =
      existing.status === "processed" ||
      existing.processing_status === "processed";
    return {
      ok: true,
      eventId: existing.id,
      duplicate: true,
      alreadyProcessed: processed,
    };
  }

  const { data: inserted, error } = await db
    .from("webhook_events")
    .insert({
      provider: params.provider,
      idempotency_key: params.idempotencyKey,
      payload: {
        topic: params.topic ?? null,
        body: params.payload,
      },
      status: "received",
      processing_status: "received",
      merchant_store_id: params.merchantStoreId ?? null,
      attempt_count: 0,
    })
    .select("id")
    .single();

  if (error) {
    // Unique race — treat as duplicate
    const { data: raced } = await db
      .from("webhook_events")
      .select("id, status, processing_status")
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();
    if (raced?.id) {
      return {
        ok: true,
        eventId: raced.id,
        duplicate: true,
        alreadyProcessed:
          raced.status === "processed" || raced.processing_status === "processed",
      };
    }
    return { ok: false, error: error.message || "Failed to persist webhook event." };
  }

  return {
    ok: true,
    eventId: inserted.id,
    duplicate: false,
    alreadyProcessed: false,
  };
}

export async function markWebhookProcessed(
  db: SupabaseClient,
  eventId: string,
  patch?: { orderId?: string | null; error?: string | null; status?: string }
): Promise<void> {
  const status = patch?.status ?? (patch?.error ? "failed" : "processed");
  await db
    .from("webhook_events")
    .update({
      status,
      processing_status: status,
      processed_at: new Date().toISOString(),
      order_id: patch?.orderId ?? null,
      error: patch?.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
}
