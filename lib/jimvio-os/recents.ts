import type { OsRecentPage } from "./types";

const MAX_RECENTS = 8;

export function loadOsRecents(): OsRecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("jimvio-os-recents-v1");
    return raw ? (JSON.parse(raw) as OsRecentPage[]) : [];
  } catch {
    return [];
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
    localStorage.setItem("jimvio-os-recents-v1", JSON.stringify(next));
  } catch { /* silent */ }
}
