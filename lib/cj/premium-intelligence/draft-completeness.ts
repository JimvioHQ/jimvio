/** A CJ draft that already holds what the publish gates need (no detail refetch required). */
export function isCompleteCjDraft(input: { images: unknown; description: string | null; cjVariantCount: number }): boolean {
  const images = Array.isArray(input.images) ? input.images.filter((u) => typeof u === "string" && u.startsWith("http")) : [];
  const text = String(input.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return images.length >= 3 && text.length >= 40 && input.cjVariantCount > 0;
}
