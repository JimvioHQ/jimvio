// lib/cj/client.ts
//
// Shared helpers for talking to the CJ Dropshipping API from server routes.
// Centralizes:
//   - service-role Supabase client (bypasses RLS, sync constructor)
//   - access token retrieval (with auto-refresh, via auth.ts)
//   - vendor id retrieval from platform_settings
//   - a single fetch wrapper that handles HTTP + CJ-level errors

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export function getServiceClient(): SupabaseClient {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

/**
 * Get a valid CJ access token.
 *
 * Delegates to ./auth which handles caching, refresh on expiry, and
 * automatic re-acquisition from apiKey. Every API call goes through
 * this, so refresh happens transparently — no caller needs to know.
 */
export async function getCJToken(supabase: SupabaseClient): Promise<string> {
    const { getOrRefreshAccessToken } = await import("./auth");
    return getOrRefreshAccessToken(supabase);
}

/** Read CJ vendor id from platform_settings.cj_vendor_id.value.vendor_id, or env fallback */
export async function getCJVendorId(supabase: SupabaseClient): Promise<string> {
    const envVendor = process.env.CJ_VENDOR_ID;
    if (envVendor) return envVendor;

    const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "cj_vendor_id")
        .single();

    const row = data as { value?: { vendor_id?: string } } | null;
    if (error || !row?.value?.vendor_id) {
        throw new Error(
            "CJ vendor id not configured. Set CJ_VENDOR_ID env var or update platform_settings where key = 'cj_vendor_id'."
        );
    }
    return row.value.vendor_id;
}

/**
 * Call any CJ API endpoint with a token. Throws on:
 *   - non-2xx HTTP
 *   - CJ-level failure (result: false or success: false)
 */
export async function cjFetch<T = unknown>(
    path: string,
    token: string,
    init: RequestInit = {}
): Promise<T> {
    const url = path.startsWith("http") ? path : `${CJ_BASE}${path}`;

    const res = await fetch(url, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            "CJ-Access-Token": token,
            ...(init.headers ?? {}),
        },
    });

    if (!res.ok) {
        throw new Error(`CJ HTTP ${res.status} on ${path}`);
    }

    const json = (await res.json()) as {
        result?: boolean;
        success?: boolean;
        message?: string;
        data?: unknown;
    };

    const ok = json.result === true || json.success === true;
    if (!ok) {
        throw new Error(json.message || "CJ API error");
    }

    return json as T;
}