import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logWebhookEvent } from "@/lib/payments/webhook-logger";

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
    rawBody?: string;
    merchantStoreId?: string | null;
    topic?: string | null;
  }
): Promise<PersistWebhookResult> {
  const claimed = await logWebhookEvent(db, {
    provider: params.provider,
    idempotencyKey: `${params.provider}:${params.idempotencyKey}`,
    payload: {
      topic: params.topic ?? null,
      body: params.payload,
      rawBody: params.rawBody ?? null,
    },
  });

  if (!claimed.eventId) {
    return { ok: false, error: "Failed to persist webhook event." };
  }

  if (params.merchantStoreId && !claimed.isDuplicate) {
    const { error } = await db
      .from("webhook_events")
      .update({ merchant_store_id: params.merchantStoreId })
      .eq("id", claimed.eventId);
    if (error) {
      return { ok: false, error: error.message || "Failed to link webhook to store." };
    }
  }

  const { data: state, error: stateError } = await db
    .from("webhook_events")
    .select("status, processing_status")
    .eq("id", claimed.eventId)
    .maybeSingle();

  if (stateError) {
    return { ok: false, error: stateError.message || "Failed to read webhook state." };
  }

  const alreadyProcessed =
    state?.status === "processed" || state?.processing_status === "processed";

  return {
    ok: true,
    eventId: claimed.eventId,
    duplicate: claimed.isDuplicate,
    alreadyProcessed,
  };
}

export async function markWebhookProcessed(
  db: SupabaseClient,
  eventId: string,
  patch?: { orderId?: string | null; error?: string | null; status?: string }
): Promise<void> {
  const status = patch?.status ?? (patch?.error ? "failed" : "processed");
  const now = new Date().toISOString();
  const { error } = await db
    .from("webhook_events")
    .update({
      status,
      processing_status: status,
      processed_at: now,
      order_id: patch?.orderId ?? null,
      error: patch?.error ?? null,
      updated_at: now,
    })
    .eq("id", eventId);
  if (error) throw new Error("Unable to update Shopify webhook state: " + error.message);
}
