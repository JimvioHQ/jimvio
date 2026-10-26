import type { SupabaseClient } from "@supabase/supabase-js";
import { apiKeyHashMatches } from "./keys";
import type { ApiScope } from "./idempotency";

export type ApiAuthSuccess = {
  vendorId: string;
  keyId: string;
  scopes: ApiScope[];
};

export type ApiAuthResult =
  | { ok: true; auth: ApiAuthSuccess }
  | { ok: false; status: number; error: string };

/**
 * Authenticate merchant API key. Tenant is resolved from the key — never trust client tenant ids.
 */
export async function authenticateApiKey(
  db: SupabaseClient,
  authorizationHeader: string | null,
  requiredScope?: ApiScope
): Promise<ApiAuthResult> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing API key. Use Authorization: Bearer <key>." };
  }
  const raw = authorizationHeader.slice("Bearer ".length).trim();
  if (!raw.startsWith("jmv_")) {
    return { ok: false, status: 401, error: "Invalid API key format." };
  }

  const prefix = raw.slice(0, 12);
  const { data: key } = await db
    .from("ds_api_keys")
    .select("id, vendor_id, key_hash, scopes, revoked_at, expires_at, rate_limit_per_minute")
    .eq("key_prefix", prefix)
    .maybeSingle();

  if (!key || key.revoked_at) {
    return { ok: false, status: 401, error: "API key is invalid or revoked." };
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { ok: false, status: 401, error: "API key has expired." };
  }
  if (!apiKeyHashMatches(key.key_hash, raw)) {
    return { ok: false, status: 401, error: "API key is invalid or revoked." };
  }

  const scopes = (key.scopes ?? []) as ApiScope[];
  if (requiredScope && !scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      error: `API key missing required scope: ${requiredScope}`,
    };
  }

  await db
    .from("ds_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", key.id);

  return {
    ok: true,
    auth: { vendorId: key.vendor_id, keyId: key.id, scopes },
  };
}

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown
) {
  return Response.json(
    {
      error: {
        code,
        message,
        details: details ?? undefined,
      },
    },
    { status }
  );
}
