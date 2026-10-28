/** Shared marketplace search scoring — partial, fuzzy, synonym-aware */

import { PHYSICAL_CATEGORY_CATALOG } from "@/lib/marketplace/category-catalog";

export type SearchableProduct = {
  id: string;
  name: string;
  slug: string;
  short_description?: string | null;
  tags?: string[] | null;
  category_id?: string | null;
  product_type?: string | null;
  view_count?: number | null;
  sale_count?: number | null;
  vendor_id?: string | null;
  /** "cj" / "shopify" for supplier listings; null or "vendor" for a seller's own product. */
  source?: string | null;
};

export type SearchableCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ScoredProduct<T extends SearchableProduct = SearchableProduct> = T & {
  _searchScore: number;
};

export type SearchSuggestion = {
  id: string;
  label: string;
  kind: "product" | "category" | "query";
  href: string;
  score: number;
};

const SYNONYMS: Record<string, string[]> = {
  head: ["headphone", "headphones", "headset", "earbud", "earbuds", "headband"],
  phone: ["smartphone", "mobile", "iphone", "android", "cellphone", "charger", "holder"],
  cam: ["camera", "webcam", "security camera", "creator"],
  camera: ["webcam", "security camera", "creator", "equipment", "streaming"],
  shirt: ["fashion", "clothing", "apparel", "wear", "top", "casual"],
  gam: ["gaming", "game", "controller", "keyboard", "mouse", "headset"],
  game: ["gaming", "controller", "console", "headset", "gamer"],
  gaming: ["controller", "keyboard", "mouse", "headset", "accessories", "game"],
  lap: ["laptop", "notebook", "computer", "pc"],
  watch: ["smartwatch", "wearable", "fitness"],
  beauty: ["cosmetic", "skincare", "makeup", "wellness", "health"],
  health: ["beauty", "wellness", "cosmetic", "skincare"],
  home: ["furniture", "living", "decor", "kitchen"],
  course: ["education", "learning", "training", "tutorial"],
  soft: ["software", "saas", "app", "digital"],
  mobile: ["phone", "smartphone", "charger", "accessories"],
  bag: ["handbag", "tote", "backpack", "purse", "satchel", "luggage"],
  bags: ["bag", "handbag", "tote", "backpack", "purse"],
  shoe: ["shoes", "sneaker", "sneakers", "footwear", "boot", "boots"],
  shoes: ["shoe", "sneaker", "sneakers", "footwear", "boot", "boots"],
  ring: ["rings", "jewelry", "jewellery", "band", "engagement"],
  rings: ["ring", "jewelry", "jewellery", "band"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: ["phone", "smartphone", "gadget", "laptop", "charger", "headphone"],
  fashion: ["shirt", "clothing", "shoes", "shoe", "apparel", "dress", "bag", "handbag"],
  "creator-equipment": ["camera", "microphone", "streaming", "webcam", "tripod"],
  "gaming-accessories": ["gaming", "game", "controller", "keyboard", "headset", "mouse"],
  "health-beauty": ["beauty", "cosmetic", "skincare", "wellness", "health"],
  automotive: ["car", "vehicle", "auto", "accessories"],
};

/** Minimum length for SQL ILIKE / stem candidates — blocks `ba` / `rin` pollution */
export const MIN_SQL_TERM_LENGTH = 3;

export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%_\\]/g, "").trim().slice(0, 80);
}

export function expandSearchTerms(query: string): string[] {
  const base = sanitizeSearchTerm(query).toLowerCase();
  if (!base) return [];
  const terms = new Set<string>([base]);
  const words = base.split(/\s+/).filter(Boolean);

  for (const word of words) {
    terms.add(word);
    for (const [key, syns] of Object.entries(SYNONYMS)) {
      if (word === key || word.startsWith(key) || (key.length >= 3 && key.startsWith(word))) {
        syns.forEach((s) => terms.add(s));
      }
    }
  }

  // Plural/singular stem: shoes→shoe, bags→bag.
  // Require word length ≥ 5 so ring≠rin and bag≠ba never enter candidate retrieval.
  for (const word of words) {
    if (word.length >= 5) {
      const stem = word.slice(0, word.length - 1);
      if (stem.length >= MIN_SQL_TERM_LENGTH) terms.add(stem);
    }
  }

  return [...terms];
}

/** Terms safe for ILIKE candidate retrieval (excludes short stems like `ba`). */
export function sqlSearchTerms(query: string, limit = 6): string[] {
  return expandSearchTerms(query)
    .filter((t) => t.length >= MIN_SQL_TERM_LENGTH)
    .slice(0, limit);
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function fuzzyWordScore(word: string, term: string): number {
  if (!word || !term) return 0;
  if (term.length < MIN_SQL_TERM_LENGTH) return word === term ? 1 : 0;
  if (word === term) return 1;
  if (term.startsWith(word) && word.length >= 3) return 0.9;
  if (word.startsWith(term)) return 0.9;
  // Compound suffix/prefix: ear+ring, key+ring — reject accidental suffixes like sp+ring
  if (word.endsWith(term)) {
    const prefix = word.slice(0, -term.length);
    if (!prefix) return 1;
    if (prefix.length >= 3 && prefix.length <= 5) return 0.75;
    return 0;
  }
  if (word.includes(term) && term.length >= 5 && term.length / word.length >= 0.5) return 0.6;
  // Only allow term-includes-word for longer terms
  if (term.length >= 4 && term.includes(word) && word.length >= 3) return 0.7;
  // Positional fuzzy only for longer tokens
  if (term.length < 4 || word.length < 4) return 0;
  let matches = 0;
  const limit = Math.min(word.length, term.length);
  for (let i = 0; i < limit; i++) {
    if (word[i] === term[i]) matches++;
  }
  const ratio = matches / Math.max(word.length, term.length);
  return ratio >= 0.7 ? ratio : 0;
}

function scoreField(text: string, terms: string[]): number {
  if (!text) return 0;
  const words = text.split(/[\s,/&+-]+/).filter(Boolean);
  let best = 0;
  for (const term of terms) {
    // Prefer token matches — avoid raw substring hits like "ring" inside "spring"
    for (const word of words) {
      best = Math.max(best, fuzzyWordScore(word, term));
    }
    if (term.includes(" ") && text.includes(term)) best = Math.max(best, 1);
  }
  return best;
}

export function scoreProduct(
  product: SearchableProduct,
  terms: string[],
  categoryName?: string | null,
  vendorName?: string | null,
): number {
  const name = normalizeText(product.name);
  const desc = normalizeText(product.short_description);
  const tags = (product.tags ?? []).map((t) => normalizeText(t)).join(" ");
  const cat = normalizeText(categoryName);
  const vendor = normalizeText(vendorName);

  let score = 0;
  const nameScore = scoreField(name, terms);
  score += nameScore * 100;
  if (name.startsWith(terms[0] ?? "")) score += 25;

  const phraseWords = normalizeText(terms[0] ?? "")
    .split(" ")
    .filter((word) => word.length >= 3);
  if (phraseWords.length > 1) {
    const hits = phraseWords.filter((word) => name.includes(word)).length;
    score += hits * 24;
  }

  const tagScore = scoreField(tags, terms);
  score += tagScore * 40;

  const descScore = scoreField(desc, terms);
  score += descScore * 15;

  const catScore = scoreField(cat, terms);
  if (nameScore > 0 || descScore > 0 || tagScore > 0) {
    score += catScore * 30;
  }

  const vendorScore = scoreField(vendor, terms);
  score += vendorScore * 10;

  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat.includes(slug.replace(/-/g, " "))) continue;
    for (const term of terms) {
      if (keywords.some((k) => k.includes(term) || term.includes(k))) {
        score += catScore > 0 ? 5 : 0;
      }
    }
  }

  score += Math.min(Number(product.sale_count ?? 0) / 100, 8);
  score += Math.min(Number(product.view_count ?? 0) / 500, 5);

  // M-9: a seller's own listing ranks ahead of an equally relevant
  // dropshipped one. Only applied to products that already match.
  if (score > 0 && !isSupplierSource(product.source)) score += 12;

  return score;
}

const SUPPLIER_SOURCES = new Set(["cj", "shopify", "aliexpress", "dropship"]);

export function isSupplierSource(source: string | null | undefined): boolean {
  return typeof source === "string" && SUPPLIER_SOURCES.has(source.toLowerCase());
}

export function paginateSearchResults<T>(items: T[], page: number, pageSize: number) {
  const size = Math.min(60, Math.max(1, Math.floor(pageSize) || 1));
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(pageCount, Math.max(1, Math.floor(page) || 1));
  const start = (safePage - 1) * size;
  return {
    page: safePage,
    pageSize: size,
    total,
    pageCount,
    items: items.slice(start, start + size),
  };
}

export function rankProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  categoryById: Map<string, string>,
  vendorById: Map<string, string>,
  minScore = 8,
): ScoredProduct<T>[] {
  const terms = expandSearchTerms(query);
  if (terms.length === 0) return [];

  return products
    .map((p) => ({
      ...p,
      _searchScore: scoreProduct(
        p,
        terms,
        p.category_id ? categoryById.get(p.category_id) : undefined,
        p.vendor_id ? vendorById.get(p.vendor_id) : undefined,
      ),
    }))
    .filter((p) => p._searchScore >= minScore)
    .sort((a, b) => b._searchScore - a._searchScore);
}

export function scoreCategory(category: SearchableCategory, terms: string[]): number {
  const name = normalizeText(category.name);
  const slug = normalizeText(category.slug);
  return Math.max(scoreField(name, terms) * 50, scoreField(slug.replace(/-/g, " "), terms) * 35);
}

/**
 * Resolve category IDs via curated keyword catalogs — avoids fuzzy false positives
 * (e.g. "game" matching Fashion / Home via weak name overlap).
 */
export function resolveMatchedCategoryIds(
  categories: SearchableCategory[],
  query: string,
): string[] {
  const q = sanitizeSearchTerm(query).toLowerCase();
  if (!q) return [];
  const terms = expandSearchTerms(q);
  const ids = new Set<string>();

  for (const curated of PHYSICAL_CATEGORY_CATALOG) {
    const keywordHit = curated.matchKeywords.some((k) => {
      const key = k.toLowerCase();
      return (
        q === key ||
        q.includes(key) ||
        (key.length >= 3 && key.includes(q)) ||
        terms.some((t) => t === key || (t.length >= 3 && (t.includes(key) || key.includes(t))))
      );
    });
    if (!keywordHit) continue;

    for (const c of categories) {
      const hay = `${normalizeText(c.name)} ${normalizeText(c.slug).replace(/-/g, " ")}`;
      const curatedName = curated.name.toLowerCase();
      if (
        hay.includes(curatedName) ||
        hay.includes(curated.slug.replace(/-/g, " ")) ||
        curated.matchKeywords.some((k) => hay.includes(k.toLowerCase()))
      ) {
        ids.add(c.id);
      }
    }
  }

  // Also map CATEGORY_KEYWORDS → DB categories by slug/name
  for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const hit = keywords.some(
      (k) => q === k || q.includes(k) || terms.some((t) => t === k || t.includes(k) || k.includes(t)),
    );
    if (!hit) continue;
    for (const c of categories) {
      const hay = `${normalizeText(c.name)} ${normalizeText(c.slug).replace(/-/g, " ")}`;
      if (hay.includes(slug.replace(/-/g, " ")) || keywords.some((k) => hay.includes(k))) {
        ids.add(c.id);
      }
    }
  }

  return [...ids];
}

export function buildSuggestions(
  query: string,
  products: SearchableProduct[],
  categories: SearchableCategory[],
  type: "physical" | "digital",
  limit = 8,
): SearchSuggestion[] {
  const terms = expandSearchTerms(query);
  if (terms.length === 0) return [];

  const items: SearchSuggestion[] = [];
  const matchedIds = new Set(resolveMatchedCategoryIds(categories, query));

  for (const c of categories) {
    const score = matchedIds.has(c.id) ? Math.max(scoreCategory(c, terms), 30) : scoreCategory(c, terms);
    if (score < 25 && !matchedIds.has(c.id)) continue;
    items.push({
      id: `cat-${c.id}`,
      label: c.name,
      kind: "category",
      href: `/marketplace/${type}?category=${encodeURIComponent(c.slug)}`,
      score: score + 20,
    });
  }

  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const ranked = rankProducts(products, query, categoryById, new Map(), 5);
  for (const p of ranked.slice(0, 6)) {
    items.push({
      id: `prod-${p.id}`,
      label: p.name,
      kind: "product",
      href: `/marketplace/${p.slug}`,
      score: p._searchScore,
    });
  }

  const queryLabel = sanitizeSearchTerm(query);
  if (queryLabel.length >= 2) {
    items.push({
      id: `query-${queryLabel}`,
      label: `Search for "${queryLabel}"`,
      kind: "query",
      href: `/marketplace/search?q=${encodeURIComponent(queryLabel)}&type=${type}`,
      score: 45,
    });
  }

  return items
    .sort((a, b) => b.score - a.score)
    .filter((item, idx, arr) => arr.findIndex((x) => x.label === item.label) === idx)
    .slice(0, limit);
}
