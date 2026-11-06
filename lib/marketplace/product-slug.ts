import { cleanProductTitle } from "@/lib/marketplace/public-product";

/**
 * Buyer-facing product URL slug: from the cleaned title only. Supplier codes
 * never appear in URLs; old supplier-code URLs still resolve (by SKU) and are
 * redirected permanently by the product page.
 */
export function cleanProductSlug(name: string | null | undefined, maxLength = 80): string {
  const title = cleanProductTitle(name ?? "") ?? "";
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, maxLength)
    .replace(/-[^-]*$/, (tail) => (tail.length > 1 && title.length > maxLength ? "" : tail))
    .replace(/^-+|-+$/g, "");
  return slug || "product";
}

type SlugReader = {
  from: (table: string) => {
    select: (cols: string) => { eq: (col: string, value: string) => { maybeSingle: () => PromiseLike<{ data: unknown }> } };
  };
};

/** First free slug among base, base-2, base-3 … (then a random tail). */
export async function uniqueProductSlug(db: SlugReader, base: string): Promise<string> {
  for (let n = 1; n <= 20; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data } = await db.from("products").select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}
