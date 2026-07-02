/** Shared marketplace search scoring — partial, fuzzy, synonym-aware */

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
  hea: ["headphone", "headphones", "headset", "health", "beauty"],
  phone: ["smartphone", "mobile", "iphone", "android", "cellphone", "charger", "holder"],
  cam: ["camera", "webcam", "security camera", "creator"],
  camera: ["webcam", "security camera", "creator", "equipment", "streaming"],
  shirt: ["fashion", "clothing", "apparel", "wear", "top", "casual"],
  gam: ["gaming", "game", "controller", "keyboard", "mouse", "headset"],
  game: ["gaming", "controller", "console", "headset", "machine", "mobile"],
  gaming: ["controller", "keyboard", "mouse", "headset", "accessories"],
  lap: ["laptop", "notebook", "computer", "pc"],
  watch: ["smartwatch", "wearable", "fitness"],
  beauty: ["cosmetic", "skincare", "makeup", "wellness", "health"],
  health: ["beauty", "wellness", "cosmetic", "skincare"],
  home: ["furniture", "living", "decor", "kitchen"],
  course: ["education", "learning", "training", "tutorial"],
  soft: ["software", "saas", "app", "digital"],
  mobile: ["phone", "smartphone", "charger", "accessories"],
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  electronics: ["phone", "smartphone", "gadget", "laptop", "charger", "headphone"],
  fashion: ["shirt", "clothing", "shoes", "apparel", "dress"],
  "creator-equipment": ["camera", "microphone", "streaming", "webcam", "tripod"],
  "gaming-accessories": ["gaming", "controller", "keyboard", "headset", "mouse"],
  "health-beauty": ["beauty", "cosmetic", "skincare", "wellness", "health"],
  automotive: ["car", "vehicle", "auto", "accessories"],
};

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
      if (word.startsWith(key) || key.startsWith(word)) {
        syns.forEach((s) => terms.add(s));
      }
    }
  }

  for (const word of words) {
    if (word.length >= 3) terms.add(word.slice(0, word.length - 1));
  }

  return [...terms];
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function fuzzyWordScore(word: string, term: string): number {
  if (!word || !term) return 0;
  if (word === term) return 1;
  if (word.startsWith(term) || term.startsWith(word)) return 0.9;
  if (word.includes(term) || term.includes(word)) return 0.75;
  let matches = 0;
  const limit = Math.min(word.length, term.length);
  for (let i = 0; i < limit; i++) {
    if (word[i] === term[i]) matches++;
  }
  return matches / Math.max(word.length, term.length);
}

function scoreField(text: string, terms: string[]): number {
  if (!text) return 0;
  const words = text.split(/[\s,/&+-]+/).filter(Boolean);
  let best = 0;
  for (const term of terms) {
    if (text.includes(term)) best = Math.max(best, 1);
    for (const word of words) {
      best = Math.max(best, fuzzyWordScore(word, term));
    }
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

  const tagScore = scoreField(tags, terms);
  score += tagScore * 40;

  const catScore = scoreField(cat, terms);
  score += catScore * 30;

  const descScore = scoreField(desc, terms);
  score += descScore * 15;

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

  return score;
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

  for (const c of categories) {
    const score = scoreCategory(c, terms);
    if (score < 12) continue;
    items.push({
      id: `cat-${c.id}`,
      label: c.name,
      kind: "category",
      href: `/marketplace?type=${type}&category=${c.slug}`,
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
