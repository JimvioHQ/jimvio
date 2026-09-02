"use server";

/**
 * Thin server-action boundary for homepage / storefront clients.
 * Keeps the large marketplace action module out of the client module graph.
 */

export async function addToCart(
  productId: string,
  vendorId: string,
  quantity: number = 1,
  variantId?: string | null,
  options?: { allowPendingVariant?: boolean },
) {
  const { addToCart: impl } = await import("@/lib/actions/marketplace");
  return impl(productId, vendorId, quantity, variantId, options);
}

export async function getCartProductIds() {
  const { getCartProductIds: impl } = await import("@/lib/actions/marketplace");
  return impl();
}

export async function toggleWishlist(productId: string) {
  const { toggleWishlist: impl } = await import("@/lib/actions/marketplace");
  return impl(productId);
}
