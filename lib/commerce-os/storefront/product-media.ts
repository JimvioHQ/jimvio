export function productImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && "url" in item) {
        const url = (item as { url?: unknown }).url;
        return typeof url === "string" ? url : null;
      }
      return null;
    })
    .filter((u): u is string => Boolean(u));
}

export function productImageAt(images: unknown, index: number): string | null {
  return productImageUrls(images)[index] ?? null;
}
