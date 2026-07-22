"use client";

/**
 * Local bookmarks for collaboration objects (client-side until server table ships).
 */

const keyFor = (userId: string) => `jimvio-msg-bookmarks:${userId}`;

export function loadBookmarks(userId: string | null): Set<string> {
  if (!userId || typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function saveBookmarks(userId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(keyFor(userId), JSON.stringify([...ids]));
}

export function toggleBookmark(userId: string | null, messageId: string): boolean {
  if (!userId) return false;
  const set = loadBookmarks(userId);
  if (set.has(messageId)) set.delete(messageId);
  else set.add(messageId);
  saveBookmarks(userId, set);
  return set.has(messageId);
}

export function isBookmarked(userId: string | null, messageId: string): boolean {
  return loadBookmarks(userId).has(messageId);
}
