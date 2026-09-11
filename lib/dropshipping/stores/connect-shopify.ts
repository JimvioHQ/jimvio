import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getShopifyApiVersionFromEnv,
  normalizeShopifyDomain,
} from "@/lib/platform-shopify";
import { assertCanConnectStore } from "../entitlements/plans";
import { createShopifyConnector } from "./registry";
import { logIntegration } from "../observability/log";

export type ConnectShopifyInput = {
  vendorId: string;
  shopDomain: string;
  accessToken: string;
  name?: string;
  scopes?: string[];
  apiVersion?: string;
  /** When updating an existing merchant_stores row */
  storeId?: string;
};

export type ConnectShopifyResult =
  | {
      ok: true;
      storeId: string;
      shopName: string;
      domain: string;
      created: boolean;
    }
  | { ok: false; error: string; code: string };

/**
 * Create or update merchant_stores + credentials, test connection,
 * and link legacy shopify_credentials.merchant_store_id when present.
 */
export async function connectShopifyStore(
  db: SupabaseClient,
  input: ConnectShopifyInput
): Promise<ConnectShopifyResult> {
  const domain = normalizeShopifyDomain(input.shopDomain);
  const accessToken = input.accessToken.trim();
  const apiVersion = input.apiVersion || getShopifyApiVersionFromEnv();

  if (!domain || !accessToken) {
    return {
      ok: false,
      error: "Shop domain and access token are required.",
      code: "MISSING_CREDENTIALS",
    };
  }

  const connector = createShopifyConnector({
    shopDomain: domain,
    accessToken,
    apiVersion,
  });
  const test = await connector.testConnection();
  if (!test.ok) {
    return {
      ok: false,
      error: test.error || "Shopify connection test failed.",
      code: "CONNECTION_FAILED",
    };
  }

  const shopName = test.shopName || domain;
  let storeId = input.storeId ?? null;
  let created = false;

  if (storeId) {
    const { data: existing } = await db
      .from("merchant_stores")
      .select("id, vendor_id")
      .eq("id", storeId)
      .eq("vendor_id", input.vendorId)
      .maybeSingle();
    if (!existing) {
      return { ok: false, error: "Store not found for this merchant.", code: "STORE_NOT_FOUND" };
    }
    const { error: updErr } = await db
      .from("merchant_stores")
      .update({
        name: input.name || shopName,
        domain,
        platform: "shopify",
        status: "connected",
        scopes: input.scopes ?? [],
        last_error: null,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    if (updErr) {
      return { ok: false, error: updErr.message, code: "STORE_UPDATE_FAILED" };
    }
  } else {
    const { data: byDomain } = await db
      .from("merchant_stores")
      .select("id")
      .eq("vendor_id", input.vendorId)
      .eq("platform", "shopify")
      .eq("domain", domain)
      .maybeSingle();

    if (byDomain?.id) {
      storeId = byDomain.id;
      await db
        .from("merchant_stores")
        .update({
          name: input.name || shopName,
          status: "connected",
          scopes: input.scopes ?? [],
          last_error: null,
          connected_at: new Date().toISOString(),
          disconnected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", storeId);
    } else {
      const can = await assertCanConnectStore(db, input.vendorId);
      if (!can.ok) {
        return { ok: false, error: can.error, code: "PLAN_LIMIT" };
      }

      const { data: inserted, error: insErr } = await db
        .from("merchant_stores")
        .insert({
          vendor_id: input.vendorId,
          platform: "shopify",
          name: input.name || shopName,
          domain,
          status: "connected",
          scopes: input.scopes ?? [],
          connected_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insErr || !inserted) {
        return {
          ok: false,
          error: insErr?.message || "Failed to create merchant store.",
          code: "STORE_CREATE_FAILED",
        };
      }
      storeId = inserted.id;
      created = true;
    }
  }

  if (!storeId) {
    return { ok: false, error: "Store id missing after connect.", code: "STORE_ID_MISSING" };
  }

  const credResult = await updateShopifyCredentials(db, {
    storeId,
    accessToken,
    apiVersion,
  });
  if (!credResult.ok) return credResult;

  // Link legacy shopify_credentials row when present
  await db
    .from("shopify_credentials")
    .update({ merchant_store_id: storeId, is_active: true })
    .eq("vendor_id", input.vendorId)
    .eq("shop_domain", domain);

  // Also upsert a legacy row so older sync paths keep working
  const { data: legacy } = await db
    .from("shopify_credentials")
    .select("id")
    .eq("vendor_id", input.vendorId)
    .eq("shop_domain", domain)
    .maybeSingle();

  if (legacy?.id) {
    await db
      .from("shopify_credentials")
      .update({
        access_token: accessToken,
        api_version: apiVersion,
        merchant_store_id: storeId,
        is_active: true,
      })
      .eq("id", legacy.id);
  } else {
    await db.from("shopify_credentials").insert({
      vendor_id: input.vendorId,
      shop_domain: domain,
      access_token: accessToken,
      api_version: apiVersion,
      merchant_store_id: storeId,
      is_active: true,
    });
  }

  await logIntegration(db, {
    vendorId: input.vendorId,
    storeId,
    operation: "store_connect",
    status: "success",
    metadata: { platform: "shopify", domain, created },
  });

  return {
    ok: true,
    storeId,
    shopName,
    domain,
    created,
  };
}

export async function updateShopifyCredentials(
  db: SupabaseClient,
  params: { storeId: string; accessToken: string; apiVersion?: string }
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const apiVersion = params.apiVersion || getShopifyApiVersionFromEnv();
  const { data: existing } = await db
    .from("merchant_store_credentials")
    .select("id")
    .eq("store_id", params.storeId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from("merchant_store_credentials")
      .update({
        access_token_encrypted: params.accessToken,
        api_version: apiVersion,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: error.message, code: "CREDENTIALS_UPDATE_FAILED" };
    }
  } else {
    const { error } = await db.from("merchant_store_credentials").insert({
      store_id: params.storeId,
      access_token_encrypted: params.accessToken,
      api_version: apiVersion,
    });
    if (error) {
      return { ok: false, error: error.message, code: "CREDENTIALS_CREATE_FAILED" };
    }
  }
  return { ok: true };
}

export async function testShopifyStoreConnection(
  db: SupabaseClient,
  storeId: string,
  vendorId?: string
): Promise<{ ok: boolean; shopName?: string; error?: string }> {
  let query = db
    .from("merchant_stores")
    .select("id, vendor_id, status")
    .eq("id", storeId);
  if (vendorId) query = query.eq("vendor_id", vendorId);
  const { data: store } = await query.maybeSingle();
  if (!store) return { ok: false, error: "Store not found." };

  try {
    const { loadStoreConnector } = await import("./registry");
    const loaded = await loadStoreConnector(db, storeId);
    if (!loaded) return { ok: false, error: "Store connector could not be loaded." };
    const result = await loaded.connector.testConnection();
    await db
      .from("merchant_stores")
      .update({
        status: result.ok ? "connected" : "error",
        last_error: result.ok ? null : result.error ?? "Connection test failed.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    return result;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Shopify connection test failed.";
    await db
      .from("merchant_stores")
      .update({
        status: "error",
        last_error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId);
    return { ok: false, error: message };
  }
}

export async function disconnectShopifyStore(
  db: SupabaseClient,
  storeId: string,
  vendorId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: store } = await db
    .from("merchant_stores")
    .select("id")
    .eq("id", storeId)
    .eq("vendor_id", vendorId)
    .maybeSingle();
  if (!store) return { ok: false, error: "Store not found for this merchant." };

  await db
    .from("merchant_stores")
    .update({
      status: "disconnected",
      disconnected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  // Clear tokens from credential tables (do not leave active tokens after disconnect)
  await db
    .from("merchant_store_credentials")
    .update({
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId);

  await db
    .from("shopify_credentials")
    .update({
      access_token: "",
      merchant_store_id: null,
      is_active: false,
    })
    .eq("merchant_store_id", storeId);

  await logIntegration(db, {
    vendorId,
    storeId,
    operation: "store_disconnect",
    status: "success",
  });

  return { ok: true };
}
