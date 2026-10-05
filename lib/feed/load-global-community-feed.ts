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
/**
 * Ranking pool size. Large enough to cover the curated ~2500 active posts
 * without scanning unbounded history. Previous MAX_POOL=10000 with chunked
 * `.in(community_id)` fan-out caused 100+ DB round-trips per request.
 */
const MAX_POOL = 2_500;
const POOL_PAGE = 500;
const MAX_POOL_ROUNDS = 6;
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
  profiles?: {
    username?: string | null;
    email?: string | null;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
  communities?: {
    slug?: string | null;
    name?: string | null;
    is_private?: boolean | null;
    is_active?: boolean | null;
    visibility?: string | null;
    visibility_mode?: string | null;
    archived_at?: string | null;
  } | null;
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
  // Public pool: community join must still be discoverable (visibility_mode etc.).
  if (post.communities && !communityIsPubliclyDiscoverable(post.communities)) {
    return false;
  }
  return isGuestVisiblePublicPost(post);
}

function isBeforeCursor(post: GlobalCommunityFeedPost, before: RawCursor): boolean {
  if (post.created_at < before.created_at) return true;
  if (post.created_at > before.created_at) return false;
  return post.id < before.id;
}

const POST_SELECT =
  "id, community_id, author_id, created_at, body, attachments, audience, is_exclusive, space_id, post_type, like_count, comment_count, view_count, share_count, title, images, video_url, room_id, profiles!community_posts_author_id_fkey(full_name, avatar_url, username, email), communities!inner(slug, name, is_private, is_active, visibility, visibility_mode, archived_at)";

/**
 * Public discoverable posts via a single communities!inner join.
 * Avoids loading hundreds of community UUIDs into `.in()` chunks.
 */
async function fetchPublicRawBatch(
  db: Db,
  before: RawCursor | null,
  limit: number,
): Promise<GlobalCommunityFeedPost[]> {
  const fetchLimit = Math.min(limit + 32, 1000);
  let query = db
    .from("community_posts")
    .select(POST_SELECT)
    .eq("is_published", true)
    .is("archived_at", null)
    .eq("communities.is_active", true)
    .is("communities.archived_at", null)
    .or("communities.is_private.eq.false,communities.is_private.is.null")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(fetchLimit);

  if (before) {
    query = query.lte("created_at", before.created_at);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as GlobalCommunityFeedPost[];
  return before ? rows.filter((row) => isBeforeCursor(row, before)) : rows;
}

/**
 * Member-only private communities still need explicit `.in()` chunking
 * (usually a small set).
 */
async function fetchMemberRawBatch(
  db: Db,
  communityIds: string[],
  before: RawCursor | null,
  limit: number,
): Promise<GlobalCommunityFeedPost[]> {
  if (!communityIds.length) return [];
  const chunks = chunkIds(communityIds, COMMUNITY_IN_CHUNK);
  const fetchLimit = Math.min(limit + 32, 1000);
  const pages = await Promise.all(
    chunks.map(async (ids) => {
      let query = db
        .from("community_posts")
        .select(POST_SELECT)
        .in("community_id", ids)
        .eq("is_published", true)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(fetchLimit);

      if (before) {
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

async function loadEligiblePostPool(
  db: Db,
  opts: {
    mode: "public" | "member";
    communityIds?: string[];
    asOf?: number;
  },
): Promise<GlobalCommunityFeedPost[]> {
  if (opts.mode === "member" && !opts.communityIds?.length) return [];

  const memberSet =
    opts.mode === "member" ? new Set(opts.communityIds ?? []) : undefined;
  const eligible: GlobalCommunityFeedPost[] = [];
  const seen = new Set<string>();
  let before: RawCursor | null = null;
  let guard = 0;

  while (eligible.length < MAX_POOL && guard < MAX_POOL_ROUNDS) {
    guard += 1;
    const batch: GlobalCommunityFeedPost[] =
      opts.mode === "public"
        ? await fetchPublicRawBatch(db, before, POOL_PAGE)
        : await fetchMemberRawBatch(db, opts.communityIds ?? [], before, POOL_PAGE);
    if (!batch.length) break;

    for (const post of batch) {
      if (seen.has(post.id)) continue;
      seen.add(post.id);

      if (opts.asOf != null) {
        const created = Date.parse(post.created_at);
        if (Number.isFinite(created) && created > opts.asOf) continue;
      }

      if (
        isEligiblePost(post, {
          memberAccess: opts.mode === "member",
          memberSet,
        })
      ) {
        eligible.push(post);
        if (eligible.length >= MAX_POOL) break;
      }
    }

    const last: GlobalCommunityFeedPost = batch[batch.length - 1]!;
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
  /** Skip a second public-communities lookup when the caller already has IDs. */
  publicCommunityIds?: string[];
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

  // Public pool uses communities!inner — no full public-ID scan required.
  // Only resolve which memberships are private (usually a tiny IN list).
  const memberIds = (params.memberCommunityIds ?? []).filter(Boolean);
  let memberOnlyIds: string[] = [];
  if (memberIds.length) {
    if (params.publicCommunityIds?.length) {
      const publicSet = new Set(params.publicCommunityIds);
      memberOnlyIds = memberIds.filter((id) => !publicSet.has(id));
    } else {
      const chunks = chunkIds(memberIds, COMMUNITY_IN_CHUNK);
      const privateRows = await Promise.all(
        chunks.map(async (ids) => {
          const { data, error } = await db
            .from("communities")
            .select("id")
            .in("id", ids)
            .eq("is_private", true)
            .eq("is_active", true)
            .is("archived_at", null);
          if (error) throw new Error(error.message);
          return (data ?? []).map((row) => row.id as string);
        }),
      );
      memberOnlyIds = privateRows.flat();
    }
  }

  // Public pool uses communities!inner (no ID fan-out). Member-private pool
  // only runs when the viewer has private memberships outside the public set.
  const [publicPool, memberPool] = await Promise.all([
    loadEligiblePostPool(db, { mode: "public", asOf }),
    memberOnlyIds.length
      ? loadEligiblePostPool(db, {
          mode: "member",
          communityIds: memberOnlyIds,
          asOf,
        })
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
