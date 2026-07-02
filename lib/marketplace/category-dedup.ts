export type CategoryLike = {
  id: string;
  name: string;
  slug: string;
  product_count?: number | null;
};

/** Normalize category names/slugs for duplicate detection (e.g. Baby vs Babies). */
export function normalizeCategoryKey(name: string, slug?: string | null): string {
  const raw = (slug?.trim() || name).toLowerCase();
  const normalized = raw
    .replace(/&/g, " and ")
    .replace(/[-_]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized.split(" ").map((word) => {
    if (word === "babies") return "baby";
    if (word === "children") return "child";
    if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith("s") && !word.endsWith("ss") && word.length > 3) return word.slice(0, -1);
    return word;
  });

  return words.join(" ");
}

function dedupScore(c: CategoryLike): number {
  let score = Number(c.product_count ?? 0) * 1000;
  const name = c.name.toLowerCase();
  if (/\bbabies\b/.test(name)) score -= 100;
  if (/\bchildren\b/.test(name)) score -= 50;
  score -= name.length;
  return score;
}

/** Deduplicate categories by normalized name/slug similarity. Keeps the best canonical match. */
export function dedupeCategories<T extends CategoryLike>(categories: T[]): T[] {
  const seenId = new Set<string>();
  const seenSlug = new Set<string>();
  const bestByNorm = new Map<string, T>();

  for (const c of categories) {
    const id = c.id?.trim();
    const slug = c.slug?.toLowerCase().trim();
    if (id && seenId.has(id)) continue;
    if (slug && seenSlug.has(slug)) continue;

    const norm = normalizeCategoryKey(c.name, c.slug);
    const prev = bestByNorm.get(norm);
    if (!prev || dedupScore(c) > dedupScore(prev)) {
      bestByNorm.set(norm, c);
    }
    if (id) seenId.add(id);
    if (slug) seenSlug.add(slug);
  }

  const seenNorm = new Set<string>();
  const out: T[] = [];
  for (const c of categories) {
    const norm = normalizeCategoryKey(c.name, c.slug);
    if (seenNorm.has(norm)) continue;
    const winner = bestByNorm.get(norm);
    if (!winner) continue;
    seenNorm.add(norm);
    out.push(winner);
  }
  return out;
}
