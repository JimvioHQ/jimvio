import type { SupabaseClient } from "@supabase/supabase-js";

const WEBHOOK_MAX_ATTEMPTS = 5;
const WEBHOOK_IN_FLIGHT_MS = 2 * 60 * 1000;

/**
 * Persist an idempotent webhook claim. Processed events stay terminal; failed
 * events and stale in-flight events can be claimed again with compare-and-swap.
 */
export async function logWebhookEvent(
  db: SupabaseClient,
  opts: {
    provider: string;
    idempotencyKey: string;
    payload: unknown;
    orderId?: string | null;
  },
): Promise<{ eventId: string | null; isDuplicate: boolean }> {
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: inserted, error: insertError } = await db
    .from("webhook_events")
    .upsert(
      {
        provider: opts.provider,
        idempotency_key: opts.idempotencyKey,
        payload: opts.payload,
        order_id: opts.orderId ?? null,
        status: "received",
        processing_status: "processing",
        attempt_count: 1,
        dead_letter: false,
        error: null,
        updated_at: nowIso,
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (insertError) {
    console.error("[webhook-logger] insert/claim failed", {
      provider: opts.provider,
      code: insertError.code,
      message: insertError.message,
    });
    return { eventId: null, isDuplicate: false };
  }

  if (inserted?.id) {
    return { eventId: inserted.id, isDuplicate: false };
  }

  const { data: existing, error: existingError } = await db
    .from("webhook_events")
    .select("id, status, updated_at, attempt_count, dead_letter")
    .eq("idempotency_key", opts.idempotencyKey)
    .maybeSingle();

  if (existingError || !existing?.id) {
    console.error("[webhook-logger] existing event lookup failed", {
      provider: opts.provider,
      message: existingError?.message,
    });
    return { eventId: null, isDuplicate: false };
  }

  if (existing.status === "processed" || existing.status === "ignored" || existing.dead_letter) {
    return { eventId: existing.id, isDuplicate: true };
  }

  const updatedAtMs = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
  const inFlight =
    ["received", "processing"].includes(String(existing.status)) &&
    Number.isFinite(updatedAtMs) &&
    now.getTime() - updatedAtMs < WEBHOOK_IN_FLIGHT_MS;

  if (inFlight) {
    return { eventId: existing.id, isDuplicate: true };
  }

  const nextAttempt = Number(existing.attempt_count ?? 0) + 1;
  const { data: claimed, error: claimError } = await db
    .from("webhook_events")
    .update({
      status: "received",
      processing_status: "processing",
      attempt_count: nextAttempt,
      dead_letter: false,
      error: null,
      updated_at: nowIso,
    })
    .eq("id", existing.id)
    .eq("status", existing.status)
    .eq("updated_at", existing.updated_at)
    .select("id")
    .maybeSingle();

  if (claimError || !claimed?.id) {
    return { eventId: existing.id, isDuplicate: true };
  }

  return { eventId: claimed.id, isDuplicate: false };
}

export async function markWebhookProcessed(
  db: SupabaseClient,
  eventId: string,
  orderId?: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db
    .from("webhook_events")
    .update({
      status: "processed",
      processing_status: "processed",
      processed_at: now,
      error: null,
      dead_letter: false,
      ...(orderId ? { order_id: orderId } : {}),
      updated_at: now,
    })
    .eq("id", eventId);
  if (error) throw new Error("Unable to mark webhook processed: " + error.message);
}

export async function markWebhookFailed(
  db: SupabaseClient,
  eventId: string,
  error: string,
  orderId?: string | null,
): Promise<void> {
  const { data: existing } = await db
    .from("webhook_events")
    .select("attempt_count")
    .eq("id", eventId)
    .maybeSingle();

  const deadLetter = Number(existing?.attempt_count ?? 1) >= WEBHOOK_MAX_ATTEMPTS;
  const now = new Date().toISOString();

  await db
    .from("webhook_events")
    .update({
      status: deadLetter ? "dead_letter" : "failed",
      processing_status: deadLetter ? "dead_letter" : "failed",
      error: error.slice(0, 2000),
      dead_letter: deadLetter,
      ...(orderId ? { order_id: orderId } : {}),
      updated_at: now,
    })
    .eq("id", eventId);
}
