import type { RecentItem } from "./types";

const RECENTS_KEY = "jimvio_command_center_recents_v1";
const MAX_RECENTS = 16;

export function readCommandRecents(): RecentItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentItem =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentItem).id === "string" &&
          typeof (item as RecentItem).title === "string",
      )
      .sort((a, b) => b.visitedAt - a.visitedAt)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

export function pushCommandRecent(item: Omit<RecentItem, "visitedAt">) {
  if (typeof window === "undefined") return;
  const entry: RecentItem = { ...item, visitedAt: Date.now() };
  const prev = readCommandRecents().filter((r) => r.id !== entry.id);
  const next = [entry, ...prev].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    // silent
  }
}

export function clearCommandRecents() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(RECENTS_KEY);
}

export function recentToSearchResult(item: RecentItem) {
  return {
    id: `recent-${item.id}`,
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle ?? "Recently visited",
    href: item.href,
    section: "recent" as const,
  };
}
