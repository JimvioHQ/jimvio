// lib/cj/client.ts
//
// Shared helpers for talking to the CJ Dropshipping API from server routes.
// Centralizes:
//   - service-role Supabase client (bypasses RLS, sync constructor)
//   - access token retrieval (with auto-refresh, via auth.ts)
//   - vendor id retrieval from platform_settings
//   - a single fetch wrapper that handles HTTP + CJ-level errors

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseSecretKey, getSupabaseUrl } from "@/lib/supabase/service-role";

export const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

export function getServiceClient(): SupabaseClient {
    return createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
        auth: { autoRefreshToken: false, persistSession: false },
    });
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

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CJ_VENDOR_SLUGS = ["jimvio-store", "jimvio-dropshipping"] as const;

function isUuid(value: unknown): value is string {
    return typeof value === "string" && UUID_RE.test(value);
}

let cachedCjVendorId: string | null = null;

function asVendorIdCandidate(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return isUuid(trimmed) ? trimmed : null;
}

async function vendorExists(
    supabase: SupabaseClient,
    vendorId: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("id", vendorId)
        .maybeSingle();
    return !error && Boolean(data?.id);
}

async function readPlatformSettingsVendorId(
    supabase: SupabaseClient
): Promise<string | null> {
    const { data, error } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "cj_vendor_id")
        .maybeSingle();

    if (error) return null;
    const row = data as { value?: { vendor_id?: string } } | null;
    return asVendorIdCandidate(row?.value?.vendor_id);
}

async function persistPlatformSettingsVendorId(
    supabase: SupabaseClient,
    vendorId: string
): Promise<void> {
    const { error } = await supabase.from("platform_settings").upsert(
        {
            key: "cj_vendor_id",
            value: { vendor_id: vendorId },
        },
        { onConflict: "key" }
    );
    if (error) {
        console.warn(
            `[CJ] Failed to persist platform_settings.cj_vendor_id: ${error.message}`
        );
    }
}

/**
 * Resolve the Jimvio `vendors.id` used for CJ Dropshipping products.
 *
 * Candidates are accepted only when they exist in `vendors`.
 * A stale CJ_VENDOR_ID env value must never be inserted as products.vendor_id.
 */
export async function getCJVendorId(supabase: SupabaseClient): Promise<string> {
    if (cachedCjVendorId) return cachedCjVendorId;

    const envVendor = asVendorIdCandidate(process.env.CJ_VENDOR_ID);
    if (envVendor) {
        if (await vendorExists(supabase, envVendor)) {
            cachedCjVendorId = envVendor;
            return envVendor;
        }
        console.warn(
            `[CJ] Ignoring CJ_VENDOR_ID from env — ${envVendor} is not a vendors.id`
        );
    } else if (process.env.CJ_VENDOR_ID?.trim()) {
        console.warn(
            "[CJ] Ignoring CJ_VENDOR_ID from env — value is not a UUID vendors.id"
        );
    }

    const settingsVendor = await readPlatformSettingsVendorId(supabase);
    if (settingsVendor && (await vendorExists(supabase, settingsVendor))) {
        cachedCjVendorId = settingsVendor;
        return settingsVendor;
    }
    if (settingsVendor) {
        console.warn(
            `[CJ] Ignoring platform_settings.cj_vendor_id — ${settingsVendor} is not a vendors.id`
        );
    }

    for (const slug of CJ_VENDOR_SLUGS) {
        const { data: bySlug } = await supabase
            .from("vendors")
            .select("id")
            .eq("business_slug", slug)
            .maybeSingle();
        if (bySlug?.id && isUuid(bySlug.id)) {
            await persistPlatformSettingsVendorId(supabase, bySlug.id);
            cachedCjVendorId = bySlug.id;
            return bySlug.id;
        }
    }

    const { data: byName } = await supabase
        .from("vendors")
        .select("id")
        .or("business_name.ilike.%jimvio store%,business_name.ilike.%dropship%")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
    if (byName?.id && isUuid(byName.id)) {
        await persistPlatformSettingsVendorId(supabase, byName.id);
        cachedCjVendorId = byName.id;
        return byName.id;
    }

    const { data: fromProduct } = await supabase
        .from("products")
        .select("vendor_id")
        .eq("source", "cj")
        .is("deleted_at", null)
        .not("vendor_id", "is", null)
        .limit(1)
        .maybeSingle();
    const mappedVendor = asVendorIdCandidate(fromProduct?.vendor_id);
    if (mappedVendor && (await vendorExists(supabase, mappedVendor))) {
        await persistPlatformSettingsVendorId(supabase, mappedVendor);
        cachedCjVendorId = mappedVendor;
        return mappedVendor;
    }

    throw new Error(
        "CJ vendor id not configured. Set CJ_VENDOR_ID to an existing vendors.id UUID, or update platform_settings where key = 'cj_vendor_id'."
    );
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

const RETRYABLE_HTTP = new Set([429, 500, 502, 503]);

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * CJ API fetch with exponential backoff on rate limits / transient errors.
 */
export async function cjFetchWithRetry<T = unknown>(
    path: string,
    token: string,
    init: RequestInit = {},
    options: { maxRetries?: number; baseDelayMs?: number } = {}
): Promise<T> {
    const maxRetries = options.maxRetries ?? 5;
    const baseDelayMs = options.baseDelayMs ?? 1000;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
            const status = res.status;
            lastError = new Error(`CJ HTTP ${status} on ${path}`);

            if (RETRYABLE_HTTP.has(status) && attempt < maxRetries) {
                const retryAfterHeader = res.headers.get("retry-after");
                const retryAfterSec = retryAfterHeader
                    ? parseInt(retryAfterHeader, 10)
                    : NaN;
                const delay = Number.isFinite(retryAfterSec)
                    ? retryAfterSec * 1000
                    : baseDelayMs * Math.pow(2, attempt);

                console.warn(
                    `[CJ] HTTP ${status} on ${path} — retry ${attempt + 1}/${maxRetries} in ${delay}ms`
                );
                await sleep(delay);
                continue;
            }

            throw lastError;
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

    throw lastError ?? new Error(`CJ request failed on ${path}`);
}