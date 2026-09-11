import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

export async function claimIdempotency(
  db: SupabaseClient,
  params: {
    vendorId: string | null;
    scope: string;
    idempotencyKey: string;
    requestHash?: string;
  }
): Promise<{ hit: boolean; responseBody?: unknown; responseStatus?: number }> {
  const { data: existing } = await db
    .from("ds_idempotency_keys")
    .select("response_body, response_status, expires_at")
    .eq("scope", params.scope)
    .eq("idempotency_key", params.idempotencyKey)
    .maybeSingle();

  if (existing?.response_body != null) {
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      await db
        .from("ds_idempotency_keys")
        .delete()
        .eq("scope", params.scope)
        .eq("idempotency_key", params.idempotencyKey);
    } else {
      return {
        hit: true,
        responseBody: existing.response_body,
        responseStatus: existing.response_status ?? 200,
      };
    }
  }

  const { error } = await db.from("ds_idempotency_keys").insert({
    vendor_id: params.vendorId,
    scope: params.scope,
    idempotency_key: params.idempotencyKey,
    request_hash: params.requestHash ?? null,
  });

  // Unique violation → concurrent duplicate; re-read
  if (error) {
    const { data: raced } = await db
      .from("ds_idempotency_keys")
      .select("response_body, response_status")
      .eq("scope", params.scope)
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();
    if (raced?.response_body != null) {
      return {
        hit: true,
        responseBody: raced.response_body,
        responseStatus: raced.response_status ?? 200,
      };
    }
  }

  return { hit: false };
}

export async function completeIdempotency(
  db: SupabaseClient,
  scope: string,
  idempotencyKey: string,
  responseStatus: number,
  responseBody: unknown
): Promise<void> {
  await db
    .from("ds_idempotency_keys")
    .update({
      response_status: responseStatus,
      response_body: responseBody as object,
    })
    .eq("scope", scope)
    .eq("idempotency_key", idempotencyKey);
}

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `jmv_${randomBytes(24).toString("base64url")}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: hashApiKey(raw) };
}

export const API_SCOPES = [
  "products:read",
  "products:write",
  "inventory:read",
  "orders:read",
  "orders:write",
  "fulfillment:read",
  "fulfillment:write",
  "shipping:read",
  "stores:read",
  "stores:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];
