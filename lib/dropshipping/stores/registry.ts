import type { SupabaseClient } from "@supabase/supabase-js";
import { ShopifyStoreConnector } from "./shopify-connector";
import type { StoreConnector, StorePlatform } from "./types";
import { getShopifyApiVersionFromEnv } from "@/lib/platform-shopify";

/**
 * Minimal credential decrypt/pass-through.
 * Tokens are stored in merchant_store_credentials; prefer encryption at rest via DB.
 * Never return tokens to client responses.
 */
export async function loadStoreConnector(
  db: SupabaseClient,
  storeId: string
): Promise<{ connector: StoreConnector; vendorId: string; platform: StorePlatform } | null> {
  const { data: store } = await db
    .from("merchant_stores")
    .select("id, vendor_id, platform, domain, status")
    .eq("id", storeId)
    .maybeSingle();

  if (!store) return null;

  const { data: creds } = await db
    .from("merchant_store_credentials")
    .select("access_token_encrypted, api_version, api_key_encrypted, api_secret_encrypted")
    .eq("store_id", storeId)
    .maybeSingle();

  if (store.platform === "shopify") {
    // Fallback: legacy shopify_credentials linked by merchant_store_id or vendor domain
    let token = creds?.access_token_encrypted ?? null;
    let apiVersion = creds?.api_version ?? getShopifyApiVersionFromEnv();
    let domain = store.domain;

    if (!token) {
      const { data: legacy } = await db
        .from("shopify_credentials")
        .select("access_token, api_version, shop_domain, vendor_id")
        .or(
          `merchant_store_id.eq.${storeId},and(vendor_id.eq.${store.vendor_id},shop_domain.eq.${store.domain})`
        )
        .limit(1)
        .maybeSingle();
      if (legacy?.access_token) {
        token = legacy.access_token;
        apiVersion = legacy.api_version || apiVersion;
        domain = legacy.shop_domain || domain;
      }
    }

    if (!token || !domain) {
      throw new Error("Shopify connection is not configured. Connect your store first.");
    }

    return {
      vendorId: store.vendor_id,
      platform: "shopify",
      connector: new ShopifyStoreConnector({
        shopDomain: domain,
        accessToken: token,
        apiVersion,
      }),
    };
  }

  if (store.platform === "woocommerce") {
    throw new Error(
      "WooCommerce connector is architected but not configured for this store yet."
    );
  }

  throw new Error(`Store platform "${store.platform}" is not configured.`);
}

export function createShopifyConnector(opts: {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
}): StoreConnector {
  return new ShopifyStoreConnector({
    shopDomain: opts.shopDomain,
    accessToken: opts.accessToken,
    apiVersion: opts.apiVersion || getShopifyApiVersionFromEnv(),
  });
}
