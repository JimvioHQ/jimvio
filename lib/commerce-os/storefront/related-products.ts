/** Keep related merchandising inside the current store's product list. */
export function relatedStoreProducts<T extends { id: string }>(
  products: T[],
  currentId: string,
  limit = 8
): T[] {
  return products.filter((product) => product.id !== currentId).slice(0, limit);
}

export function shouldRenderCategorySection(
  collections: Array<{ id?: string; handle?: string }> | null | undefined
): boolean {
  return Boolean(collections?.length);
}

export function storefrontLetterMark(name: string): string {
  const trimmed = name.trim();
  return (trimmed.slice(0, 1) || "S").toUpperCase();
}

export function mobileNavOffsetVar(mobileNavStyle?: string | null): string {
  return !mobileNavStyle || mobileNavStyle === "bottom" ? "3.5rem" : "0px";
}
