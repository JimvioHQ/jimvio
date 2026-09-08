import {
  JIMVIO_EDITORIAL_AUTHOR_EMAIL,
  readPostEditorialMeta,
} from "@/lib/community/editorial-origin";

/**
 * Legacy constant retained for docs/tests that mention the old window.
 * Fresh global-feed loads now mint a per-request session seed (see
 * {@link getGlobalFeedRotationBucket}) so re-entry/refresh can surface a
 * different eligible mix without waiting hours. Pagination locks the seed
 * inside the cursor so load-more stays stable within a feed session.
 */
export const GLOBAL_FEED_ROTATION_MS = 3 * 60 * 60 * 1000;

/** Mint a unique feed session seed for community-mix / head selection. */
export function getGlobalFeedRotationBucket(now = Date.now()): number {
  // Same-ms requests must still diverge, otherwise consecutive refreshes look static.
  const entropy =
    typeof process !== "undefined" && typeof process.hrtime?.bigint === "function"
      ? Number(process.hrtime.bigint() % 1_000_000n)
      : Math.floor(Math.random() * 1_000_000);
  return now * 1_000_000 + entropy;
}

export type GlobalFeedCursor = {
  bucket: number;
  offset: number;
};

export function encodeGlobalFeedCursor(cursor: GlobalFeedCursor): string {
  return `${cursor.bucket}:${cursor.offset}`;
}

export function parseGlobalFeedCursor(
  raw: string | null | undefined,
  now = Date.now(),
): GlobalFeedCursor {
  if (!raw) return { bucket: now, offset: 0 };
  const [bucketPart, offsetPart] = raw.split(":");
  const parsedBucket = Number.parseInt(bucketPart ?? "", 10);
  const offset = Number.parseInt(offsetPart ?? "", 10);
  if (!Number.isFinite(parsedBucket) || !Number.isFinite(offset) || offset < 0) {
    return { bucket: now, offset: 0 };
  }
  // Trust the cursor seed so infinite-scroll pages stay consistent even as
  // wall-clock advances between page fetches.
  return { bucket: parsedBucket, offset };
}

/**
 * Global discovery feed excludes Jimvio promotional/system posts.
 * Community-scoped feeds may still show them where appropriate.
 */
export function isExcludedFromGlobalFeed(post: {
  attachments?: unknown;
  body?: string | null;
  profiles?: { username?: string | null; email?: string | null } | null;
}): boolean {
  const meta = readPostEditorialMeta(post.attachments);
  if (meta.origin === "promotion") return true;

  const username = (post.profiles?.username ?? "").trim().toLowerCase();
  if (username === "jimvio") return true;

  const email = (post.profiles?.email ?? "").trim().toLowerCase();
  if (email === JIMVIO_EDITORIAL_AUTHOR_EMAIL.toLowerCase()) return true;

  const body = (post.body ?? "").trim();
  if (body.startsWith("From Jimvio")) return true;

  return false;
}
