import type { CachedIntelligence, CJIntelligencePayload } from "./enrichment-types";

const CACHE_PREFIX = "jimvio:cj-intel:";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 500;

function cacheKey(pid: string): string {
  return `${CACHE_PREFIX}${pid}`;
}

export function getCachedIntelligence(pid: string): CJIntelligencePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(pid));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CachedIntelligence;
    if (Date.now() - entry.cachedAt > TTL_MS) {
      localStorage.removeItem(cacheKey(pid));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedIntelligence(data: CJIntelligencePayload): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CachedIntelligence = { data, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(data.pid), JSON.stringify(entry));
    pruneOldEntries();
  } catch {
    // quota — best effort
  }
}

function pruneOldEntries(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    if (keys.length <= MAX_ENTRIES) return;
    const entries = keys
      .map((k) => {
        try {
          const e = JSON.parse(localStorage.getItem(k) ?? "") as CachedIntelligence;
          return { key: k, cachedAt: e.cachedAt ?? 0 };
        } catch {
          return { key: k, cachedAt: 0 };
        }
      })
      .sort((a, b) => a.cachedAt - b.cachedAt);
    const toRemove = entries.slice(0, entries.length - MAX_ENTRIES);
    for (const { key } of toRemove) localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getBulkCachedIntelligence(
  pids: string[]
): Record<string, CJIntelligencePayload> {
  const map: Record<string, CJIntelligencePayload> = {};
  for (const pid of pids) {
    const hit = getCachedIntelligence(pid);
    if (hit) map[pid] = hit;
  }
  return map;
}
