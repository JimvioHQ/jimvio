/**
 * Legacy Dropshipping OS path map → Commerce OS.
 * Used by redirects (next.config) and docs. APIs are NOT redirected.
 */
export const DROPSHIPPING_TO_COMMERCE_REDIRECTS: Record<string, string> = {
  "/dropshipping": "/commerce",
  "/dropshipping/dashboard": "/commerce",
  "/dropshipping/stores": "/commerce/connected-stores",
  "/dropshipping/integrations": "/commerce/integrations",
  "/dropshipping/products": "/commerce/channel-products",
  "/dropshipping/orders": "/commerce/channel-orders",
  "/dropshipping/inventory": "/commerce/channel-inventory",
  "/dropshipping/pricing": "/commerce/pricing",
  "/dropshipping/sync": "/commerce/sync",
  "/dropshipping/api": "/commerce/api-keys",
  "/dropshipping/settings": "/commerce/channel-settings",
};

export function mapDropshippingPathToCommerce(pathname: string): string | null {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (DROPSHIPPING_TO_COMMERCE_REDIRECTS[clean]) {
    return DROPSHIPPING_TO_COMMERCE_REDIRECTS[clean];
  }
  if (clean.startsWith("/dropshipping/")) {
    return "/commerce";
  }
  return null;
}
