import { createClient } from "@supabase/supabase-js";
import {
  getPlatformShopifyVendorIdFromEnv,
  getShopifyApiVersionFromEnv,
  isPlatformShopifyEnvCredentialsComplete,
  normalizeShopifyDomain,
} from "@/lib/platform-shopify";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface ShopifyCredentials {
  vendorId: string;
  shopDomain: string;
  accessToken: string;
  apiVersion: string;
  platformCommissionRate: number;
}

export async function saveVendorToken(creds: ShopifyCredentials) {
  const { error } = await supabase.from("shopify_credentials").upsert(
    {
      vendor_id: creds.vendorId,
      shop_domain: creds.shopDomain,
      access_token: creds.accessToken,
      api_version: creds.apiVersion,
      platform_commission_rate: creds.platformCommissionRate,
      connected_at: new Date().toISOString(),
      is_active: true,
    },
    { onConflict: "vendor_id" }
  );
  if (error) throw new Error(`Failed to save Shopify token: ${error.message}`);
}

function credentialsFromEnvPlatformVendor(vendorId: string): ShopifyCredentials {
  const shopDomain = normalizeShopifyDomain(process.env.SHOPIFY_SHOP_DOMAIN!);
  return {
    vendorId,
    shopDomain,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
    apiVersion: getShopifyApiVersionFromEnv(),
    platformCommissionRate: Number(process.env.SHOPIFY_DEFAULT_PLATFORM_COMMISSION_RATE || 8),
  };
}

export async function getVendorTokenByVendorId(vendorId: string): Promise<ShopifyCredentials> {
  const platformVid = getPlatformShopifyVendorIdFromEnv();
  if (platformVid && vendorId === platformVid && isPlatformShopifyEnvCredentialsComplete()) {
    return credentialsFromEnvPlatformVendor(vendorId);
  }

  const { data, error } = await supabase
    .from("shopify_credentials")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
    .single();
  if (error || !data) throw new Error(`No active Shopify credentials for vendor: ${vendorId}`);
  return {
    vendorId: data.vendor_id,
    shopDomain: data.shop_domain,
    accessToken: data.access_token,
    apiVersion: data.api_version,
    platformCommissionRate: Number(data.platform_commission_rate),
  };
}

export async function getVendorTokenByDomain(shopDomain: string): Promise<ShopifyCredentials | null> {
  const normalized = normalizeShopifyDomain(shopDomain);
  const platformVid = getPlatformShopifyVendorIdFromEnv();
  if (platformVid && isPlatformShopifyEnvCredentialsComplete()) {
    const envDomain = normalizeShopifyDomain(process.env.SHOPIFY_SHOP_DOMAIN!);
    if (normalized === envDomain) {
      return credentialsFromEnvPlatformVendor(platformVid);
    }
  }

  const { data } = await supabase
    .from("shopify_credentials")
    .select("*")
    .eq("shop_domain", normalized)
    .eq("is_active", true)
    .single();
  if (!data) return null;
  return {
    vendorId: data.vendor_id,
    shopDomain: data.shop_domain,
    accessToken: data.access_token,
    apiVersion: data.api_version,
    platformCommissionRate: Number(data.platform_commission_rate),
  };
}

export function buildShopifyHeaders(accessToken: string) {
  return {
    "Content-Type": "application/json",
    "X-Shopify-Access-Token": accessToken,
  };
}

export function buildShopifyBaseUrl(shopDomain: string, apiVersion: string) {
  return `https://${shopDomain}/admin/api/${apiVersion}`;
}
