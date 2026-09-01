import "server-only";

import type { createClient } from "@/lib/supabase/server";
import { isTechnicalFeedBody } from "@/lib/community/message-signaling";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import { rankFeedItems } from "@/lib/growth/feed-ranking";
import { isGuestVisiblePublicPost } from "@/lib/feed/public-post-visibility";
import { loadGlobalCommunityFeed } from "@/lib/feed/load-global-community-feed";

const PAGE_SIZE = 20;
const FEED_FILTERS = new Set([
  "for-you",
  "trending",
  "hot",
  "rising",
  "newest",
  "recommended",
  "following",
  "friends",
  "verified",
  "ai-picks",
  "spaces",
  "missions",
]);

type Db = Awaited<ReturnType<typeof createClient>>;

function excludeTechnicalPosts<T extends { body?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => !isTechnicalFeedBody(row.body));
}

/** Match RLS COALESCE(is_private, false) = false — NULL privacy is public. */
export async function loadPublicCommunityIds(
  db: Db,
  limit = 2000,
): Promise<{ ids: string[]; error: string | null }> {
  const ids: string[] = [];
  const pageSize = 200;
  let from = 0;

  while (ids.length < limit) {
    const to = from + pageSize - 1;
    const { data, error } = await db
      .from("communities")
      .select("id, is_active, is_private, visibility, visibility_mode, archived_at")
      .eq("is_active", true)
      .or("is_private.eq.false,is_private.is.null")
      .order("member_count", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error loading public communities:", error);
      return { ids: [], error: error.message };
    }

    const rows = data ?? [];
    ids.push(...rows.filter(communityIsPubliclyDiscoverable).map((c) => c.id));
    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { ids: ids.slice(0, limit), error: null };
}

export type PublicDiscoveryFeedParams = {
  limit?: number;
  cursor?: string | null;
  filter?: string | null;
  communityId?: string | null;
  draftsOnly?: boolean;
};

export type PublicDiscoveryFeedOk = {
  ok: true;
  posts: Record<string, unknown>[];
  next_cursor: string | null;
};

export type PublicDiscoveryFeedErr = {
  ok: false;
  status: number;
  error: string;
};

/**
 * Logged-out discovery: published posts from public communities.
 * Never returns private/members-only content. Drafts require auth.
 */
export async function loadPublicDiscoveryFeed(
  db: Db,
  params: PublicDiscoveryFeedParams = {},
): Promise<PublicDiscoveryFeedOk | PublicDiscoveryFeedErr> {
  const limit = Math.min(Number(params.limit ?? PAGE_SIZE) || PAGE_SIZE, 50);
  const cursor = params.cursor ?? null;
  const requestedFilter = params.filter ?? "for-you";
  const filter = FEED_FILTERS.has(requestedFilter) ? requestedFilter : "for-you";
  const communityId = params.communityId ?? null;
  const draftsOnly = params.draftsOnly === true;

  if (draftsOnly) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  // Personalized filters need an account — surface public discovery instead.
  const publicFilter =
    filter === "following" || filter === "friends" ? "for-you" : filter;

  let publicCommunityIds: string[] = [];
  if (communityId) {
    const { data: community, error: communityError } = await db
      .from("communities")
      .select("id, is_private, is_active, visibility, visibility_mode, archived_at")
      .eq("id", communityId)
      .maybeSingle();
    if (communityError) {
      console.error("Error loading public community:", communityError);
      return { ok: false, status: 400, error: communityError.message };
    }
    if (!community || !communityIsPubliclyDiscoverable(community)) {
      return { ok: false, status: 403, error: "No access" };
    }
    publicCommunityIds = [community.id];
  } else {
    const loaded = await loadPublicCommunityIds(db);
    if (loaded.error) {
      return { ok: false, status: 400, error: loaded.error };
    }
    publicCommunityIds = loaded.ids;
  }

  if (!publicCommunityIds.length) {
    return { ok: true, posts: [], next_cursor: null };
  }

  // Global feed: ranked pool with Jimvio promo/system exclusions.
  if (!communityId) {
    const useRanking = publicFilter !== "newest";
    try {
      const global = await loadGlobalCommunityFeed(db, {
        limit,
        cursor,
        useRanking,
      });
      let posts = global.posts;

      if (publicFilter === "verified") {
        const { data: featuredCommunities } = await db
          .from("communities")
          .select("id")
          .in("id", publicCommunityIds)
          .or("is_featured.eq.true,member_count.gte.100");
        const featuredIds = new Set((featuredCommunities ?? []).map((c) => c.id));
        posts = posts.filter((p) => featuredIds.has(p.community_id));
      } else if (publicFilter === "spaces") {
        posts = posts.filter(
          (p) => p.space_id && p.space_id !== "00000000-0000-0000-0000-000000000000",
        );
      } else if (publicFilter === "missions") {
        posts = posts.filter((p) =>
          ["mission", "task", "challenge"].includes(String(p.post_type ?? "")),
        );
      } else if (publicFilter === "trending" || publicFilter === "hot" || publicFilter === "rising") {
        const maxAgeMs =
          publicFilter === "hot"
            ? 48 * 3_600_000
            : publicFilter === "rising"
              ? 7 * 24 * 3_600_000
              : 14 * 24 * 3_600_000;
        const cutoff = Date.now() - maxAgeMs;
        posts = posts.filter((p) => {
          const created = p.created_at ? new Date(p.created_at).getTime() : 0;
          if (created < cutoff) return false;
          if (publicFilter === "rising") return true;
          return (
            Number(p.like_count ?? 0) >= 1 ||
            Number(p.comment_count ?? 0) >= 1
          );
        });
      }

      const enriched = posts.map((post) => ({
        ...post,
        user_has_liked: false,
        user_reaction: null,
        user_has_saved: false,
        quoted_post: null,
      }));

      return {
        ok: true,
        posts: enriched as Record<string, unknown>[],
        next_cursor: global.next_cursor,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load global feed";
      return { ok: false, status: 400, error: message };
    }
  }

  let query = db
    .from("community_posts")
    .select(
      "*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username), communities(slug, name, is_private)",
    )
    .in("community_id", publicCommunityIds)
    .eq("is_published", true)
    .is("archived_at", null);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  switch (publicFilter) {
    case "trending":
    case "ai-picks":
      query = query
        .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
        .or("like_count.gte.1,comment_count.gte.1");
      break;
    case "hot":
      query = query
        .gte("created_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString())
        .or("like_count.gte.1,comment_count.gte.1");
      break;
    case "rising":
      query = query.gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
      break;
    case "verified": {
      const { data: featuredCommunities } = await db
        .from("communities")
        .select("id")
        .in("id", publicCommunityIds)
        .or("is_featured.eq.true,member_count.gte.100");
      const featuredIds = (featuredCommunities ?? []).map((community) => community.id);
      if (!featuredIds.length) return { ok: true, posts: [], next_cursor: null };
      query = query.in("community_id", featuredIds);
      break;
    }
    case "spaces":
      query = query.neq("space_id", "00000000-0000-0000-0000-000000000000");
      break;
    case "missions":
      query = query.in("post_type", ["mission", "task", "challenge"]);
      break;
    default:
      break;
  }

  // Global discovery is chronological so pinned welcome posts cannot dominate.
  // Community-scoped feeds may still surface pins first (community-level feature).
  if (communityId) {
    query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }
  const { data, error } = await query.limit(Math.min(limit * 2 + 4, 80));

  if (error) {
    console.error("Error fetching public discovery feed:", error);
    return { ok: false, status: 400, error: error.message };
  }

  const rows = excludeTechnicalPosts(data ?? []);
  const safeRows = rows.filter((post) => isGuestVisiblePublicPost(post));

  const hasMore = safeRows.length > limit;
  const pageRows = safeRows.slice(0, limit);

  let enriched = pageRows.map((post) => ({
    ...post,
    user_has_liked: false,
    user_reaction: null,
    user_has_saved: false,
    quoted_post: null,
  }));

  const shouldRank = ["for-you", "trending", "ai-picks", "hot", "rising", "recommended"].includes(
    publicFilter,
  );
  if (shouldRank) {
    enriched = rankFeedItems(enriched as unknown as Parameters<typeof rankFeedItems>[0], {
      viewerId: "",
      followedAuthorIds: new Set(),
    }) as typeof enriched;
  }

  const next_cursor =
    hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1]!.created_at : null;

  return { ok: true, posts: enriched as Record<string, unknown>[], next_cursor };
}
