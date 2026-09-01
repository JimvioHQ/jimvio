import type { OsNotification, OsRecentPage } from "./types";
import { OS_ACTIVITY_SCAFFOLD } from "./config";
import { OS_FAVORITES_STORAGE_KEY, OS_RECENTS_STORAGE_KEY } from "./config";

export function loadOsFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OS_FAVORITES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveOsFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OS_FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* silent */
  }
}

export function loadOsRecents(): OsRecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OS_RECENTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OsRecentPage[]) : [];
  } catch {
    return [];
  }
}

export function pushOsRecent(page: Omit<OsRecentPage, "visitedAt">) {
  if (typeof window === "undefined") return;
  const existing = loadOsRecents().filter((p) => p.href !== page.href);
  const next: OsRecentPage[] = [{ ...page, visitedAt: Date.now() }, ...existing].slice(0, 8);
  try {
    localStorage.setItem(OS_RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* silent */
  }
}

export function buildScaffoldNotifications(): OsNotification[] {
  return [
    { id: "n1", category: "orders", title: "New order #1042", body: "A customer placed a new order.", time: "2m ago", read: false, archived: false, href: "/orders" },
    { id: "n2", category: "payments", title: "Payout processed", body: "$240.00 sent to your wallet.", time: "1h ago", read: false, archived: false, href: "/wallet" },
    { id: "n3", category: "messages", title: "New buyer message", body: "Question about shipping timeline.", time: "3h ago", read: true, archived: false, href: "/messages" },
    { id: "n4", category: "payments", title: "Payment received", body: "+$18.20 from store sale.", time: "5h ago", read: true, archived: false, href: "/wallet" },
    { id: "n5", category: "ugc", title: "UGC submission", body: "Creator submitted campaign video.", time: "Yesterday", read: false, archived: false, href: "/ugc" },
    { id: "n6", category: "communities", title: "New member", body: "Someone joined your community hub.", time: "Yesterday", read: true, archived: false, href: "/owner/communities" },
    { id: "n7", category: "security", title: "New login", body: "Sign-in from Chrome on macOS.", time: "2d ago", read: true, archived: false },
    { id: "n8", category: "system", title: "Platform update", body: "Jimvio OS frontend architecture ready.", time: "3d ago", read: true, archived: false },
  ];
}

export function buildScaffoldActivity() {
  return OS_ACTIVITY_SCAFFOLD.map((item, i) => ({
    id: `activity-${i}`,
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle,
    time: i === 0 ? "Just now" : `${i + 1}m ago`,
    live: i < 2,
  }));
}
