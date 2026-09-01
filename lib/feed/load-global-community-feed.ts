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
import { loadPublicCommunityIds } from "@/lib/feed/load-public-discovery-feed";

const POOL_PAGE = 1000;
const MAX_POOL = 10_000;

type Db = Awaited<ReturnType<typeof createClient>>;

export type GlobalCommunityFeedPost = Record<string, unknown> & {
  id: string;
  community_id: string;
  created_at: string;
  body?: string | null;
  attachments?: unknown;
  audience?: string | null;
  is_exclusive?: boolean | null;
  space_id?: string | null;
  post_type?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  profiles?: { username?: string | null; email?: string | null; full_name?: string | null; avatar_url?: string | null } | null;
  communities?: { slug?: string | null; name?: string | null; is_private?: boolean | null } | null;
};

async function loadEligiblePostPool(
  db: Db,
  communityIds: string[],
  opts?: { memberAccess?: boolean },
): Promise<GlobalCommunityFeedPost[]> {
  if (!communityIds.length) return [];

  const rows: GlobalCommunityFeedPost[] = [];
  let from = 0;

  while (rows.length < MAX_POOL) {
    const to = from + POOL_PAGE - 1;
    const { data, error } = await db
      .from("community_posts")
      .select(
        "*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username, email), communities(slug, name, is_private)",
      )
      .in("community_id", communityIds)
      .eq("is_published", true)
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);
    const batch = (data ?? []) as GlobalCommunityFeedPost[];
    rows.push(...batch);
    if (batch.length < POOL_PAGE) break;
    from += POOL_PAGE;
  }

  const memberSet = new Set(communityIds);
  return rows.filter((post) => {
    if (isTechnicalFeedBody(post.body)) return false;
    if (isExcludedFromGlobalFeed(post)) return false;
    if (opts?.memberAccess) return isMemberVisiblePost(post, memberSet);
    return isGuestVisiblePublicPost(post);
  });
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
};

export type LoadGlobalCommunityFeedResult = {
  posts: GlobalCommunityFeedPost[];
  next_cursor: string | null;
  rotation_bucket: number;
};

/**
 * Global community feed: all eligible public posts, excluding Jimvio promo/system posts.
 * Ranked with quality-first + 3-hour deterministic community mix when useRanking=true.
 */
export async function loadGlobalCommunityFeed(
  db: Db,
  params: LoadGlobalCommunityFeedParams = {},
): Promise<LoadGlobalCommunityFeedResult> {
  const limit = Math.min(Math.max(Number(params.limit ?? 20) || 20, 1), 50);
  const now = Date.now();
  const bucket = getGlobalFeedRotationBucket(now);
  const parsed = parseGlobalFeedCursor(params.cursor, now);
  const offset = parsed.offset;

  const { ids: communityIds, error } = await loadPublicCommunityIds(db);
  if (error) throw new Error(error);

  const memberIds = (params.memberCommunityIds ?? []).filter(Boolean);
  const memberOnlyIds = memberIds.filter((id) => !communityIds.includes(id));

  if (!communityIds.length && !memberOnlyIds.length) {
    return { posts: [], next_cursor: null, rotation_bucket: bucket };
  }

  const [publicPool, memberPool] = await Promise.all([
    communityIds.length ? loadEligiblePostPool(db, communityIds) : Promise.resolve([]),
    memberOnlyIds.length
      ? loadEligiblePostPool(db, memberOnlyIds, { memberAccess: true })
      : Promise.resolve([]),
  ]);

  const pool = [...publicPool, ...memberPool];

  const seen = new Set<string>();
  const dedupedPool = pool.filter((post) => {
    if (seen.has(post.id)) return false;
    seen.add(post.id);
    return true;
  });

  let ordered = dedupedPool;
  if (params.useRanking !== false) {
    ordered = rankGlobalFeedItems(dedupedPool, {
      viewerId: params.viewerId ?? "",
      followedAuthorIds: params.followedAuthorIds ?? new Set(),
      now,
      bucket,
    });
  } else {
    ordered = [...dedupedPool].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const page = ordered.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const next_cursor =
    nextOffset < ordered.length
      ? encodeGlobalFeedCursor({ bucket, offset: nextOffset })
      : null;

  return { posts: page, next_cursor, rotation_bucket: bucket };
}

/** Re-export for callers that need public community discovery checks. */
export { communityIsPubliclyDiscoverable };
