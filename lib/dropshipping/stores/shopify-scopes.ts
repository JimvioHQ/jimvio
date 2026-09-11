/**
 * Central Shopify Admin API scopes for Jimvio Commerce OAuth.
 * Least privilege — each scope maps to a live Jimvio feature (see SCOPE_JUSTIFICATION).
 */
export const SHOPIFY_DEFAULT_OAUTH_SCOPES = [
  "read_products",
  "write_products",
  "read_orders",
  "write_orders",
  "read_inventory",
  "write_inventory",
  "read_locations",
  "read_fulfillments",
  "write_fulfillments",
  // Fulfillment Orders API used by createFulfillment / tracking pushback
  "read_merchant_managed_fulfillment_orders",
  "write_merchant_managed_fulfillment_orders",
] as const;

/** Why each default scope is requested (App Store review / PCD justification). */
export const SHOPIFY_SCOPE_JUSTIFICATION: Record<
  (typeof SHOPIFY_DEFAULT_OAUTH_SCOPES)[number],
  string
> = {
  read_products: "Read catalog for sync status and product updates from Shopify.",
  write_products: "Publish and update products from Jimvio Commerce OS to the merchant store.",
  read_orders: "Ingest Shopify orders into Jimvio for fulfillment routing and sync.",
  write_orders:
    "Create Shopify orders when Jimvio Marketplace checkout settles against a linked Shopify catalog (same Partner app credentials).",
  read_inventory: "Read inventory item / level state before quantity sync.",
  write_inventory: "Push inventory quantities from Jimvio / suppliers to Shopify locations.",
  read_locations: "Resolve the merchant location used by inventory_levels / inventorySetQuantities.",
  read_fulfillments: "Read fulfillment state before tracking pushback.",
  write_fulfillments: "Create fulfillments and attach tracking from Jimvio / CJ.",
  read_merchant_managed_fulfillment_orders:
    "List open fulfillment orders on merchant-managed orders before fulfill.",
  write_merchant_managed_fulfillment_orders:
    "Fulfill merchant-managed fulfillment orders with tracking.",
};

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
