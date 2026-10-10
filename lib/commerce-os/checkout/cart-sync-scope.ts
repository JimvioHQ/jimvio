/**
 * Storefront carts hold catalog/supplier vendor ids on each line.
 * The order itself is owned by the merchant store (`jimvio_store_id`),
 * so syncing lines by `orders.vendor_id` treats a real cart as empty and
 * cancels the pending order before checkout can load it.
 */
export function shouldScopeCartSyncToCatalogVendor(order: {
  jimvio_store_id?: string | null;
}): boolean {
  return !order.jimvio_store_id;
}
