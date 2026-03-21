const STORAGE_KEY = "jimvio-nav-search-history";
const MAX_ITEMS = 12;

export function readNavSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addNavSearchHistory(term: string) {
  if (typeof window === "undefined") return;
  const t = term.trim();
  if (!t) return;
  const prev = readNavSearchHistory();
  const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearNavSearchHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
