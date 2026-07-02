import type { CJProduct } from "./types";

const RECENT_KEY = "jimvio:cj-recent-searches";
const MAX_RECENT = 8;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function fuzzyMatch(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q) return 0;
  if (t.includes(q)) return 1;
  if (t.startsWith(q)) return 0.95;
  const words = t.split(/\s+/);
  for (const w of words) {
    if (w.startsWith(q)) return 0.85;
    if (levenshtein(q, w) <= Math.max(1, Math.floor(q.length / 3))) return 0.7;
  }
  const dist = levenshtein(q, t.slice(0, Math.max(q.length + 4, 20)));
  if (dist <= 2) return 0.6;
  return 0;
}

export function scoreProductSearch(product: CJProduct, query: string): number {
  if (!query.trim()) return 1;
  const scores = [
    fuzzyMatch(query, product.productNameEn) * 1.0,
    fuzzyMatch(query, product.productSku) * 0.9,
    fuzzyMatch(query, product.pid) * 0.95,
    fuzzyMatch(query, product.categoryName ?? "") * 0.5,
    fuzzyMatch(query, product.threeCategoryName ?? "") * 0.5,
    fuzzyMatch(query, product.countryCode ?? "") * 0.4,
    fuzzyMatch(query, product.supplierName ?? "") * 0.6,
  ];
  return Math.max(...scores);
}

export function filterBySmartSearch(
  products: CJProduct[],
  query: string
): CJProduct[] {
  const q = query.trim();
  if (!q) return products;
  return products
    .map((p) => ({ p, score: scoreProductSearch(p, q) }))
    .filter(({ score }) => score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

export function getSearchSuggestions(
  products: CJProduct[],
  query: string,
  limit = 6
): string[] {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const seen = new Set<string>();
  const suggestions: string[] = [];

  for (const p of products) {
    const candidates = [
      p.productNameEn,
      p.productSku,
      p.pid,
      p.categoryName,
      p.threeCategoryName,
    ].filter(Boolean) as string[];

    for (const c of candidates) {
      const n = normalize(c);
      if (n.includes(q) && !seen.has(c)) {
        seen.add(c);
        suggestions.push(c);
        if (suggestions.length >= limit) return suggestions;
      }
    }
  }
  return suggestions;
}

export function loadRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(query: string): void {
  if (typeof window === "undefined" || !query.trim()) return;
  const q = query.trim();
  const recent = loadRecentSearches().filter((s) => s !== q);
  recent.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}
