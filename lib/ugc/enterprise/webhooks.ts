import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomBytes } from "crypto";

export function newWebhookSecret() {
  return randomBytes(24).toString("hex");
}

export function signUgcWebhookBody(secret: string, body: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export async function emitUgcWebhook(
  db: SupabaseClient,
  brandId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  const { data: subs } = await db
    .from("ugc_webhook_subscriptions")
    .select("id, url, secret, events, is_active")
    .eq("brand_id", brandId)
    .eq("is_active", true);

  const matches = (subs ?? []).filter(
    (s) => !s.events?.length || s.events.includes(eventType) || s.events.includes("*")
  );

  for (const sub of matches) {
    const body = JSON.stringify({ event: eventType, data: payload });
    const idempotencyKey = createHash("sha256")
      .update(`${sub.id}:${eventType}:${JSON.stringify(payload)}`)
      .digest("hex")
      .slice(0, 32);
    const signature = signUgcWebhookBody(sub.secret, body);

    const { data: existingDelivery } = await db
      .from("ugc_webhook_deliveries")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();
    if (existingDelivery) continue;

    const { data: delivery, error: insertErr } = await db
      .from("ugc_webhook_deliveries")
      .insert({
        subscription_id: sub.id,
        event_type: eventType,
        payload: { event: eventType, data: payload },
        status: "pending",
        attempts: 1,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (insertErr?.code === "23505") continue;

    try {
      const res = await fetch(sub.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Jimvio-Event": eventType,
          "X-Jimvio-Signature": signature,
        },
        body,
        signal: AbortSignal.timeout(8000),
      });
      await db
        .from("ugc_webhook_deliveries")
        .update({
          status: res.ok ? "delivered" : "failed",
          response_code: res.status,
          delivered_at: res.ok ? new Date().toISOString() : null,
        })
        .eq("id", delivery?.id);
    } catch {
      await db
        .from("ugc_webhook_deliveries")
        .update({ status: "failed", response_code: 0 })
        .eq("id", delivery?.id);
    }
  }
}
