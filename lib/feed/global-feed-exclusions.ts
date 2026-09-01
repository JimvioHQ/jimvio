import {
  JIMVIO_EDITORIAL_AUTHOR_EMAIL,
  readPostEditorialMeta,
} from "@/lib/community/editorial-origin";

/** 3-hour deterministic rotation window for global feed ordering. */
export const GLOBAL_FEED_ROTATION_MS = 3 * 60 * 60 * 1000;

export function getGlobalFeedRotationBucket(now = Date.now()): number {
  return Math.floor(now / GLOBAL_FEED_ROTATION_MS);
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
  const bucket = getGlobalFeedRotationBucket(now);
  if (!raw) return { bucket, offset: 0 };
  const [bucketPart, offsetPart] = raw.split(":");
  const parsedBucket = Number.parseInt(bucketPart ?? "", 10);
  const offset = Number.parseInt(offsetPart ?? "", 10);
  if (parsedBucket !== bucket || !Number.isFinite(offset) || offset < 0) {
    return { bucket, offset: 0 };
  }
  return { bucket, offset };
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
