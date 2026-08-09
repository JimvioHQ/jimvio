import type { OsRecentPage } from "./types";

const MAX_RECENTS = 8;
const STORAGE_KEY = "jimvio-os-recents-v1";

/** Stable empty snapshot for SSR / useSyncExternalStore. */
const EMPTY_RECENTS: OsRecentPage[] = [];

/** Cache so getSnapshot keeps referential identity until localStorage changes. */
let cachedRaw: string | null | undefined;
let cachedRecents: OsRecentPage[] = EMPTY_RECENTS;

export function loadOsRecents(): OsRecentPage[] {
  if (typeof window === "undefined") return EMPTY_RECENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedRecents;
    cachedRaw = raw;
    cachedRecents = raw ? (JSON.parse(raw) as OsRecentPage[]) : EMPTY_RECENTS;
    return cachedRecents;
  } catch {
    cachedRaw = null;
    cachedRecents = EMPTY_RECENTS;
    return EMPTY_RECENTS;
  }
}

export function pushOsRecent(page: Omit<OsRecentPage, "visitedAt">) {
  if (typeof window === "undefined") return;
  try {
    const existing = loadOsRecents().filter((p) => p.href !== page.href);
    const next: OsRecentPage[] = [
      { ...page, visitedAt: Date.now() },
      ...existing,
    ].slice(0, MAX_RECENTS);
    const raw = JSON.stringify(next);
    localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedRecents = next;
    window.dispatchEvent(new Event("jimvio-os-recents"));
  } catch { /* silent */ }
}
