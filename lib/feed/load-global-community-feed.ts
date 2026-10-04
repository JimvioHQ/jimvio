import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { isGuestVisiblePublicPost } from "@/lib/feed/public-post-visibility";
import {
  encodeGlobalFeedCursor,
  getGlobalFeedRotationBucket,
  isExcludedFromGlobalFeed,
  parseGlobalFeedCursor,
} from "@/lib/feed/global-feed-exclusions";
import { rankGlobalFeedItems } from "@/lib/feed/global-feed-ranking";
import {
  applyFeedTabFilter,
  diversifyAuthors,
  sortRisingByVelocity,
} from "@/lib/feed/apply-feed-tab-filter";
import { loadPublicCommunityIds } from "@/lib/feed/load-public-discovery-feed";

const POOL_PAGE = 500;
const MAX_POOL = 10_000;
/** PostgREST `.in()` URL length stays safe below ~100–150 UUIDs. */
const COMMUNITY_IN_CHUNK = 120;

type Db = Awaited<ReturnType<typeof createClient>>;

export type GlobalCommunityFeedPost = Record<string, unknown> & {
  id: string;
  community_id: string;
  author_id?: string | null;
  created_at: string;
  body?: string | null;
  attachments?: unknown;
  audience?: string | null;
  is_exclusive?: boolean | null;
  space_id?: string | null;
  post_type?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  view_count?: number | null;
  profiles?: { username?: string | null; email?: string | null; full_name?: string | null; avatar_url?: string | null } | null;
  communities?: { slug?: string | null; name?: string | null; is_private?: boolean | null } | null;
};

type RawCursor = { created_at: string; id: string };

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

function compareRecency(a: GlobalCommunityFeedPost, b: GlobalCommunityFeedPost): number {
  const byCreated = b.created_at.localeCompare(a.created_at);
  if (byCreated !== 0) return byCreated;
  return b.id.localeCompare(a.id);
}

function isEligiblePost(
  post: GlobalCommunityFeedPost,
  opts?: { memberAccess?: boolean; memberSet?: Set<string> },
): boolean {
  if (isTechnicalFeedBody(post.body)) return false;
  if (isExcludedFromGlobalFeed(post)) return false;
  if (opts?.memberAccess && opts.memberSet) {
    return isMemberVisiblePost(post, opts.memberSet);
  }
  return isGuestVisiblePublicPost(post);
}

function isBeforeCursor(post: GlobalCommunityFeedPost, before: RawCursor): boolean {
  if (post.created_at < before.created_at) return true;
  if (post.created_at > before.created_at) return false;
  return post.id < before.id;
}

/**
 * Fetch the next raw page across community-id chunks using a keyset cursor,
 * then merge/sort with id tie-breaker so chunking does not hide newer posts.
 */
async function fetchRawBatch(
  db: Db,
  communityIds: string[],
  before: RawCursor | null,
  limit: number,
): Promise<GlobalCommunityFeedPost[]> {
  const chunks = chunkIds(communityIds, COMMUNITY_IN_CHUNK);
  // Over-fetch slightly so id-level tie-breaks after created_at.lte still fill a page.
  const fetchLimit = Math.min(limit + 32, 1000);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      let query = db
        .from("community_posts")
        .select(
          "*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username, email), communities(slug, name, is_private)",
        )
        .in("community_id", ids)
        .eq("is_published", true)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(fetchLimit);

      if (before) {
        // Avoid PostgREST `.or()` with unquoted ISO timestamps (colons break parsing).
        query = query.lte("created_at", before.created_at);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as GlobalCommunityFeedPost[];
      return before ? rows.filter((row) => isBeforeCursor(row, before)) : rows;
    }),
  );

  const seen = new Set<string>();
  const merged: GlobalCommunityFeedPost[] = [];
  for (const row of pages.flat().sort(compareRecency)) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    merged.push(row);
    if (merged.length >= limit) break;
  }
  return merged;
}

/**
 * Accumulate until MAX_POOL *eligible* posts (not raw rows).
 * Prevents editorial-heavy recent windows from starving older organic posts.
 */
async function loadEligiblePostPool(
  db: Db,
  communityIds: string[],
  opts?: { memberAccess?: boolean; asOf?: number },
): Promise<GlobalCommunityFeedPost[]> {
  if (!communityIds.length) return [];

  const memberSet = new Set(communityIds);
  const eligible: GlobalCommunityFeedPost[] = [];
  const seen = new Set<string>();
  let before: RawCursor | null = null;
  let guard = 0;

  while (eligible.length < MAX_POOL && guard < 40) {
    guard += 1;
    const batch = await fetchRawBatch(db, communityIds, before, POOL_PAGE);
    if (!batch.length) break;

    for (const post of batch) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);

      if (opts?.asOf != null) {
        const created = Date.parse(post.created_at);
        if (Number.isFinite(created) && created > opts.asOf) continue;
      }

      if (
        isEligiblePost(post, {
          memberAccess: opts?.memberAccess,
          memberSet,
        })
      ) {
        eligible.push(post);
        if (eligible.length >= MAX_POOL) break;
      }
    }

    const last = batch[batch.length - 1]!;
    before = { created_at: last.created_at, id: last.id };
    if (batch.length < POOL_PAGE) break;
  }

  return eligible;
}

function isMemberVisiblePost(
  post: GlobalCommunityFeedPost,
  memberCommunityIds: Set<string>,
): boolean {
  if (isExcludedFromGlobalFeed(post)) return false;
  if (isGuestVisiblePublicPost(post)) return true;
  if (!post.community_id || !memberCommunityIds.has(post.community_id)) return false;
  if (post.is_exclusive === true) return false;
  const audience = post.audience;
  if (audience === "private" || audience === "followers") return false;
  return !audience || audience === "public" || audience === "community";
}

export type LoadGlobalCommunityFeedParams = {
  limit?: number;
  cursor?: string | null;
  viewerId?: string;
  followedAuthorIds?: Set<string>;
  memberCommunityIds?: string[];
  useRanking?: boolean;
  /** Tab filter applied before pagination (hot/trending/rising/etc). */
  filter?: string | null;
  /** Featured community IDs for the verified tab (optional). */
  verifiedCommunityIds?: Set<string>;
};

export type LoadGlobalCommunityFeedResult = {
  posts: GlobalCommunityFeedPost[];
  next_cursor: string | null;
  rotation_bucket: number;
};

/**
 * Global community feed: all eligible published posts from discoverable
 * (and member-private) communities, including editorial/demo content that
 * is intentionally published. Promotional/system posts stay excluded.
 *
 * Ranked with quality-first + session-seeded community mix when useRanking=true.
 * Fresh requests (no cursor) mint a new seed + asOf freeze; pagination locks
 * both so load-more stays stable while newer posts arrive.
 */
export async function loadGlobalCommunityFeed(
  db: Db,
  params: LoadGlobalCommunityFeedParams = {},
): Promise<LoadGlobalCommunityFeedResult> {
  const limit = Math.min(Math.max(Number(params.limit ?? 20) || 20, 1), 50);
  const now = Date.now();
  const parsed = parseGlobalFeedCursor(params.cursor, now);
  // Fresh loads mint a unique session seed; load-more / soft-refresh reuse cursor.
  const bucket = params.cursor ? parsed.bucket : getGlobalFeedRotationBucket(now);
  const asOf = params.cursor ? parsed.asOf : now;
  const offset = parsed.offset;

  const { ids: communityIds, error } = await loadPublicCommunityIds(db);
  if (error) throw new Error(error);

  const memberIds = (params.memberCommunityIds ?? []).filter(Boolean);
  const memberOnlyIds = memberIds.filter((id) => !communityIds.includes(id));

  if (!communityIds.length && !memberOnlyIds.length) {
    return { posts: [], next_cursor: null, rotation_bucket: bucket };
  }

  const [publicPool, memberPool] = await Promise.all([
    communityIds.length
      ? loadEligiblePostPool(db, communityIds, { asOf })
      : Promise.resolve([]),
    memberOnlyIds.length
      ? loadEligiblePostPool(db, memberOnlyIds, { memberAccess: true, asOf })
      : Promise.resolve([]),
  ]);

  const pool = [...publicPool, ...memberPool];

  const seen = new Set<string>();
  const dedupedPool = pool.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });

  const filter = (params.filter ?? "for-you").trim() || "for-you";

  // Tab filters must run before offset pagination so Hot/Trending/Rising
  // pages are full and next_cursor reflects the filtered pool.
  let eligible = applyFeedTabFilter(dedupedPool, filter, asOf);
  if (filter === "verified" && params.verifiedCommunityIds) {
    eligible = eligible.filter((p) => params.verifiedCommunityIds!.has(p.community_id));
  }

  let ordered = eligible;
  if (params.useRanking !== false && filter !== "newest") {
    ordered = rankGlobalFeedItems(eligible, {
      viewerId: params.viewerId ?? "",
      followedAuthorIds: params.followedAuthorIds ?? new Set(),
      now: asOf,
      bucket,
    });
    if (filter === "rising") {
      ordered = sortRisingByVelocity(ordered, asOf);
    }
    ordered = diversifyAuthors(ordered);
  } else {
    ordered = [...eligible].sort((a, b) => {
      const byCreated = b.created_at.localeCompare(a.created_at);
      if (byCreated !== 0) return byCreated;
      return b.id.localeCompare(a.id);
    });
  }

  const page = ordered.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const next_cursor =
    nextOffset < ordered.length
      ? encodeGlobalFeedCursor({ bucket, offset: nextOffset, asOf })
      : null;

  return { posts: page, next_cursor, rotation_bucket: bucket };
}

/** Re-export for callers that need public community discovery checks. */
export { communityIsPubliclyDiscoverable };
