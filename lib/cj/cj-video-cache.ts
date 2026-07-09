/**
 * In-process CJ video lookup cache — 24h TTL per PID.
 */

import { getCached, setCached } from "@/lib/cj/premium-intelligence/catalog-cache";

const TTL_MS = 86_400_000; // 24 hours

export type CachedVideoResult = {
  videos: string[];
  poster: string | null;
  cachedAt: number;
};

function cacheKey(pid: string): string {
  return `cj-video:${pid}`;
}

export function getCachedCjVideos(pid: string): CachedVideoResult | null {
  return getCached<CachedVideoResult>(cacheKey(pid));
}

export function setCachedCjVideos(
  pid: string,
  videos: string[],
  poster: string | null
): void {
  setCached(
    cacheKey(pid),
    { videos, poster, cachedAt: Date.now() } satisfies CachedVideoResult,
    TTL_MS
  );
}
