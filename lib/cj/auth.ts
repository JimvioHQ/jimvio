
import type { SupabaseClient } from "@supabase/supabase-js";
import { CJ_BASE, getServiceClient } from "./client";

interface CJTokenResponse {
    openId?: number;
    accessToken: string;
    accessTokenExpiryDate: string;
    refreshToken: string;
    refreshTokenExpiryDate: string;
    createDate: string;
}

interface StoredCredentials {
    api_key?: string;
    open_id?: number;
    access_token?: string;
    refresh_token?: string;
    access_token_expires_at?: string;
    refresh_token_expires_at?: string;
    updated_at?: string;
    [k: string]: unknown;
}

// Treat tokens expiring within this window as already expired
const REFRESH_LEAD_TIME_MS = 6 * 60 * 60 * 1000; // 6 hours

// ─── API Key resolution ──────────────────────────────────────

async function getApiKey(supabase: SupabaseClient): Promise<string> {
    const envKey = process.env.CJ_API_KEY;
    if (envKey) return envKey;

    const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "cj_credentials")
        .single();

    const stored = (data as { value?: StoredCredentials } | null)?.value?.api_key;
    if (!stored) {
        throw new Error(
            "CJ apiKey not configured. Set CJ_API_KEY env var, or put it in platform_settings.cj_credentials.value.api_key."
        );
    }
    return stored;
}


export async function fetchNewAccessToken(apiKey: string): Promise<CJTokenResponse> {
    const res = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
    });

    if (!res.ok) {
        throw new Error(`CJ getAccessToken HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
        result?: boolean;
        success?: boolean;
        message?: string;
        data?: CJTokenResponse;
    };
    const ok = json.result === true || json.success === true;
    if (!ok || !json.data) {
        throw new Error(json.message || "CJ getAccessToken failed");
    }
    return json.data;
}

/** POST /authentication/refreshAccessToken */
export async function fetchRefreshedAccessToken(
    refreshToken: string
): Promise<CJTokenResponse> {
    const res = await fetch(`${CJ_BASE}/authentication/refreshAccessToken`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
        throw new Error(`CJ refreshAccessToken HTTP ${res.status}`);
    }
    const json = (await res.json()) as {
        result?: boolean;
        success?: boolean;
        message?: string;
        data?: CJTokenResponse;
    };
    const ok = json.result === true || json.success === true;
    if (!ok || !json.data) {
        throw new Error(json.message || "CJ refreshAccessToken failed");
    }
    return json.data;
}

// ─── Persistence ─────────────────────────────────────────────

async function readStoredCredentials(
    supabase: SupabaseClient
): Promise<StoredCredentials> {
    const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "cj_credentials")
        .single();
    return (data as { value?: StoredCredentials } | null)?.value ?? {};
}

async function saveCredentials(
    supabase: SupabaseClient,
    resp: CJTokenResponse,
    apiKey?: string
): Promise<void> {
    const current = await readStoredCredentials(supabase);

    const merged: StoredCredentials = {
        ...current,
        access_token: resp.accessToken,
        refresh_token: resp.refreshToken,
        access_token_expires_at: resp.accessTokenExpiryDate,
        refresh_token_expires_at: resp.refreshTokenExpiryDate,
        open_id: resp.openId ?? current.open_id,
        updated_at: new Date().toISOString(),
    };
    if (apiKey) merged.api_key = apiKey;

    const { error } = await supabase.from("platform_settings").upsert({
        key: "cj_credentials",
        value: merged,
        updated_at: new Date().toISOString(),
    });

    if (error) {
        throw new Error(`Failed to persist CJ credentials: ${error.message}`);
    }
}

export async function getOrRefreshAccessToken(
    supabase?: SupabaseClient
): Promise<string> {
    const client = supabase ?? getServiceClient();
    const stored = await readStoredCredentials(client);

    const now = Date.now();
    const accessExp = stored.access_token_expires_at
        ? Date.parse(stored.access_token_expires_at)
        : 0;
    const refreshExp = stored.refresh_token_expires_at
        ? Date.parse(stored.refresh_token_expires_at)
        : 0;

    // 1. Still good
    if (stored.access_token && accessExp - now > REFRESH_LEAD_TIME_MS) {
        return stored.access_token;
    }

    // 2. Try refresh
    if (stored.refresh_token && refreshExp > now) {
        try {
            const resp = await fetchRefreshedAccessToken(stored.refresh_token);
            await saveCredentials(client, resp);
            console.log("[CJ auth] Token refreshed");
            return resp.accessToken;
        } catch (err) {
            console.warn(
                "[CJ auth] Refresh failed, falling back to fresh apiKey acquisition:",
                err instanceof Error ? err.message : err
            );
        }
    }

    // 3. Bootstrap fresh
    const apiKey = await getApiKey(client);
    const resp = await fetchNewAccessToken(apiKey);
    await saveCredentials(client, resp, apiKey);
    console.log("[CJ auth] New token acquired via apiKey");
    return resp.accessToken;
}

/**
 * Force a fresh token from apiKey, ignoring any cached value.
 * Use when something is wrong with the stored credentials.
 */
export async function forceRefreshFromApiKey(
    supabase?: SupabaseClient
): Promise<{ accessToken: string; expiresAt: string }> {
    const client = supabase ?? getServiceClient();
    const apiKey = await getApiKey(client);
    const resp = await fetchNewAccessToken(apiKey);
    await saveCredentials(client, resp, apiKey);
    return {
        accessToken: resp.accessToken,
        expiresAt: resp.accessTokenExpiryDate,
    };
}