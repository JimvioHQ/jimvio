import { readPostEditorialMeta } from "@/lib/community/editorial-origin";

/**
 * Global hub feed exclusions and session-cursor helpers.
 *
 * Only true promotional / system posts are excluded. Intentionally published
 * editorial, demo, and seeded persona posts remain discoverable in the main
 * Community Feed (visibility / RLS still apply).
 */

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
  let entropy = Math.floor(Math.random() * 1_000_000);
  try {
    if (typeof process !== "undefined" && typeof process.hrtime?.bigint === "function") {
      entropy = Number(process.hrtime.bigint() % BigInt(1_000_000));
    }
  } catch {
    /* keep Math.random fallback */
  }
  return now * 1_000_000 + entropy;
}

export type GlobalFeedCursor = {
  bucket: number;
  offset: number;
  /** Wall-clock freeze: posts created after asOf stay out of this session. */
  asOf: number;
};

export function encodeGlobalFeedCursor(cursor: GlobalFeedCursor): string {
  return `${cursor.bucket}:${cursor.offset}:${cursor.asOf}`;
}

export function parseGlobalFeedCursor(
  raw: string | null | undefined,
  now = Date.now(),
): GlobalFeedCursor {
  if (!raw) {
    return { bucket: getGlobalFeedRotationBucket(now), offset: 0, asOf: now };
  }
  const parts = raw.split(":");
  const parsedBucket = Number.parseInt(parts[0] ?? "", 10);
  const offset = Number.parseInt(parts[1] ?? "", 10);
  const parsedAsOf = Number.parseInt(parts[2] ?? "", 10);
  if (!Number.isFinite(parsedBucket) || !Number.isFinite(offset) || offset < 0) {
    return { bucket: getGlobalFeedRotationBucket(now), offset: 0, asOf: now };
  }
  // Legacy 2-part cursors (bucket:offset) — keep seed, freeze at parse time.
  const asOf = Number.isFinite(parsedAsOf) && parsedAsOf > 0 ? parsedAsOf : now;
  return { bucket: parsedBucket, offset, asOf };
}

/** Reuse an existing session seed at offset 0 (soft refresh / re-entry). */
export function sessionStartCursorFrom(
  raw: string | null | undefined,
  now = Date.now(),
): string | null {
  if (!raw) return null;
  const parsed = parseGlobalFeedCursor(raw, now);
  return encodeGlobalFeedCursor({
    bucket: parsed.bucket,
    offset: 0,
    asOf: parsed.asOf,
  });
}

/**
 * Global discovery feed excludes Jimvio promotional/system posts only.
 * Published editorial / demo / seeded persona posts stay eligible so the
 * main Community Feed surfaces the full intentionally-visible dataset.
 */
export function isExcludedFromGlobalFeed(post: {
  attachments?: unknown;
  body?: string | null;
  profiles?: { username?: string | null; email?: string | null } | null;
}): boolean {
  const meta = readPostEditorialMeta(post.attachments);
  // Promotions are platform ads — keep them out of organic discovery.
  if (meta.origin === "promotion") return true;

  const username = (post.profiles?.username ?? "").trim().toLowerCase();
  if (username === "jimvio") return true;

  const body = (post.body ?? "").trim();
  if (body.startsWith("From Jimvio")) return true;

  return false;
}
