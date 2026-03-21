/** Default when SHOPIFY_API_VERSION is unset. */
export const SHOPIFY_API_VERSION_FALLBACK = "2024-07";

/** Single vendor row that owns the platform-operated Shopify catalog (env-configured). */
export function getPlatformShopifyVendorIdFromEnv(): string | null {
  const v = process.env.JIMVIO_PLATFORM_SHOPIFY_VENDOR_ID?.trim();
  return v || null;
}

export function normalizeShopifyDomain(input: string): string {
  return String(input)
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .trim()
    .toLowerCase();
}

export function getShopifyApiVersionFromEnv(): string {
  const v = process.env.SHOPIFY_API_VERSION?.trim();
  return v || SHOPIFY_API_VERSION_FALLBACK;
}

/** When set with platform vendor id, sync + webhooks can use .env instead of only shopify_credentials. */
export function isPlatformShopifyEnvCredentialsComplete(): boolean {
  const vendor = getPlatformShopifyVendorIdFromEnv();
  const domain = process.env.SHOPIFY_SHOP_DOMAIN?.trim();
  const token = process.env.SHOPIFY_ACCESS_TOKEN?.trim();
  return Boolean(vendor && domain && token);
}
