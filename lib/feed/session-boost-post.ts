/**
 * One-shot session boost for a newly created community post.
 * Used only in the current client feed state after publish — never persisted
 * to the database as a pin, and consumed on first feed apply so refresh/
 * re-entry return to normal ranking.
 */

const STORAGE_KEY = "jimvio:community-feed:session-boost-v1";
const MAX_AGE_MS = 10 * 60 * 1000;

type BoostPayload = {
  post: Record<string, unknown>;
  stashedAt: number;
};

export function stashSessionBoostPost(post: Record<string, unknown> | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!post || typeof post.id !== "string" || !post.id) return;
  try {
    const payload: BoostPayload = { post, stashedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function consumeSessionBoostPost<T extends { id: string }>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BoostPayload;
    if (!parsed?.post || typeof parsed.post.id !== "string") return null;
    if (!Number.isFinite(parsed.stashedAt) || Date.now() - parsed.stashedAt > MAX_AGE_MS) {
      return null;
    }
    return parsed.post as unknown as T;
  } catch {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

/** Prepend `boost` and drop any duplicate of the same id. */
export function prependUniqueById<T extends { id: string }>(posts: T[], boost: T | null): T[] {
  if (!boost?.id) return posts;
  const without = posts.filter((p) => p.id !== boost.id);
  return [boost, ...without];
}
