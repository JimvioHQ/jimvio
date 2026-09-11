/**
 * Central Shopify Admin API scopes for Jimvio Dropshipping OS OAuth.
 * Least privilege for product publish, inventory, orders, fulfillments.
 */
export const SHOPIFY_DEFAULT_OAUTH_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_inventory",
  "write_inventory",
  "read_fulfillments",
  "write_fulfillments",
  // Required for Fulfillment Orders API used by createFulfillment / tracking pushback
  "read_merchant_managed_fulfillment_orders",
  "write_merchant_managed_fulfillment_orders",
  "read_assigned_fulfillment_orders",
  "write_assigned_fulfillment_orders",
  "read_shipping",
] as const;

export function getShopifyOAuthScopes(): string {
  const fromEnv = process.env.SHOPIFY_OAUTH_SCOPES?.trim();
  if (fromEnv) return fromEnv;
  return SHOPIFY_DEFAULT_OAUTH_SCOPES.join(",");
}

export function parseShopifyScopes(scopeCsv: string | null | undefined): string[] {
  return (scopeCsv || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
