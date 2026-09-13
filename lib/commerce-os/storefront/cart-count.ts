/** Quantity sum for a store-scoped cart. Marketplace carts must not use this. */
export function storefrontCartItemCount(
  items: Array<{ quantity?: number | string | null }> | null | undefined
): number {
  if (!items?.length) return 0;
  return items.reduce((sum, item) => {
    const q = Number(item.quantity);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);
}
