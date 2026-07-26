/** Process-local TTL cache for discovery queries. */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export function discoveryCacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function discoveryCacheSet<T>(key: string, value: T, ttlMs = 60_000): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function discoveryCacheKey(parts: Record<string, unknown>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${JSON.stringify(parts[k] ?? null)}`)
    .join("&");
}
