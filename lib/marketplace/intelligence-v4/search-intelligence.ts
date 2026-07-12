/**
 * Search Intelligence v4 — synonyms, typo tolerance, semantic related terms.
 */

export interface SearchTermRecord {
  term: string;
  count: number;
  lastSearched: string;
}

const COMMON_SYNONYMS: Record<string, string[]> = {
  phone: ["mobile", "smartphone", "cellphone"],
  laptop: ["notebook", "computer", "pc"],
  shoes: ["sneakers", "footwear", "trainers"],
  bag: ["handbag", "purse", "backpack"],
  watch: ["timepiece", "wristwatch"],
  gift: ["present", "surprise"],
  dress: ["gown", "outfit"],
  headphones: ["earphones", "earbuds", "headset"],
};

export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

export function isTypoMatch(query: string, candidate: string, maxDistance = 2): boolean {
  const q = normalizeSearchTerm(query);
  const c = normalizeSearchTerm(candidate);
  if (!q || !c) return false;
  if (q === c) return true;
  if (q.length < 3 || c.length < 3) return false;
  return levenshtein(q, c) <= maxDistance;
}

export function getSynonyms(term: string): string[] {
  const normalized = normalizeSearchTerm(term);
  const direct = COMMON_SYNONYMS[normalized] ?? [];
  const reverse: string[] = [];
  for (const [key, syns] of Object.entries(COMMON_SYNONYMS)) {
    if (syns.includes(normalized)) reverse.push(key);
  }
  return [...new Set([normalized, ...direct, ...reverse])];
}

export function expandSearchQuery(term: string): string[] {
  return getSynonyms(term);
}

export function findRelatedTerms(
  term: string,
  allTerms: SearchTermRecord[],
  limit = 5
): string[] {
  const normalized = normalizeSearchTerm(term);
  const synonyms = new Set(getSynonyms(normalized));

  return allTerms
    .filter((t) => {
      const n = normalizeSearchTerm(t.term);
      if (n === normalized) return false;
      if (synonyms.has(n)) return true;
      return isTypoMatch(normalized, n, 1);
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((t) => t.term);
}

export function detectTrendingSearches(
  terms: SearchTermRecord[],
  minCount = 5
): string[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  return terms
    .filter((t) => {
      const age = now - new Date(t.lastSearched).getTime();
      return t.count >= minCount && age <= dayMs * 7;
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((t) => t.term);
}

export function semanticProductMatch(
  productName: string,
  searchTerms: string[]
): boolean {
  const haystack = productName.toLowerCase();
  for (const term of searchTerms) {
    const expanded = expandSearchQuery(term);
    if (expanded.some((t) => haystack.includes(t))) return true;
    if (isTypoMatch(term, haystack.split(" ")[0] ?? "")) return true;
  }
  return false;
}
