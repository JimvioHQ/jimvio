import "server-only";

import type { ApiPost } from "@/components/feed/FeedPostCard";
import { loadGlobalCommunityFeed } from "@/lib/feed/load-global-community-feed";
import { loadHashtagFeed } from "@/lib/feed/load-hashtag-feed";
import { normalizeHashtagQuery } from "@/lib/feed/hashtag-query";
import { loadPublicDiscoveryFeed } from "@/lib/feed/load-public-discovery-feed";
import { createClient } from "@/lib/supabase/server";

/**
 * Auth-aware SSR preload for /communities hub feed.
 * Guests get public discovery; members get ranked global feed with real like state.
 */
export async function loadHubFeedSsr(opts?: {
  filter?: string;
  limit?: number;
  tag?: string | null;
}): Promise<{ posts: ApiPost[]; next_cursor: string | null }> {
  const filter = opts?.filter ?? "for-you";
  const limit = opts?.limit ?? 20;
  const tag = normalizeHashtagQuery(opts?.tag);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const feed = await loadPublicDiscoveryFeed(supabase, { filter, limit, tag });
    if (!feed.ok) throw new Error(feed.error);
    return {
      posts: feed.posts as ApiPost[],
      next_cursor: feed.next_cursor,
    };
  }

  const [{ data: memberships }, followResult] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("community_id")
      .eq("user_id", user.id)
      .eq("status", "active"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("user_follows")
      .select("following_id")
      .eq("follower_id", user.id)
      .limit(500) as Promise<{ data: { following_id: string }[] | null }>,
  ]);

  const membershipIds = (memberships ?? []).map((m) => m.community_id);
  const followedAuthorIds = new Set<string>(
    (followResult.data ?? []).map((row) => row.following_id),
  );

  const global = tag
    ? await loadHashtagFeed(supabase, {
        tag,
        limit,
        memberCommunityIds: membershipIds,
      })
    : await loadGlobalCommunityFeed(supabase, {
    limit,
    filter,
    viewerId: user.id,
    followedAuthorIds,
    memberCommunityIds: membershipIds,
    useRanking: filter !== "newest",
  });

  const postIds = global.posts.map((p) => p.id);
  const [{ data: likedRows }, reactionResult] =
    postIds.length > 0
      ? await Promise.all([
          supabase
            .from("community_post_likes")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any)
            .from("community_post_reactions")
            .select("post_id, reaction")
            .eq("user_id", user.id)
            .in("post_id", postIds) as Promise<{
            data: { post_id: string; reaction: string }[] | null;
          }>,
        ])
      : [
          { data: [] as { post_id: string }[] },
          { data: [] as { post_id: string; reaction: string }[] },
        ];

  const likedSet = new Set((likedRows ?? []).map((row) => row.post_id));
  const reactionByPost = new Map(
    (reactionResult.data ?? []).map((r) => [r.post_id, r.reaction]),
  );

  const posts = global.posts.map((post) => {
    const userReaction = reactionByPost.get(post.id) ?? null;
    return {
      ...post,
      user_has_liked: likedSet.has(post.id) || Boolean(userReaction),
      user_reaction: userReaction,
      quoted_post: null,
    };
  }) as ApiPost[];

  return { posts, next_cursor: global.next_cursor };
}
