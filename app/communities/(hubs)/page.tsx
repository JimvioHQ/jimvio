import { FeedPageContent } from "@/components/feed/FeedPageContent";
import { normalizeHashtagQuery } from "@/lib/feed/hashtag-query";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";
import type { ApiPost } from "@/components/feed/FeedPostCard";
import { isCommunityVerified } from "@/lib/community/trending-score";
import { loadHubFeedSsr } from "@/lib/feed/load-hub-feed-ssr";
import { getHomepageCommunities } from "@/services/platform";

export const dynamic = "force-dynamic";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const tag = normalizeHashtagQuery((await searchParams).tag);
  let initialCommunities: TrendingCommunity[] = [];
  let initialPosts: ApiPost[] = [];
  let initialNextCursor: string | null = null;
  const [communityRows, feedResult] = await Promise.all([
    getHomepageCommunities(8).catch((err) => {
      console.error("[communities] public catalog preload failed:", err);
      return [] as Awaited<ReturnType<typeof getHomepageCommunities>>;
    }),
    loadHubFeedSsr({ filter: "for-you", limit: 20, tag }).catch((err) => {
      console.error("[communities] hub feed preload failed:", err);
      return { posts: [] as ApiPost[], next_cursor: null as string | null };
    }),
  ]);

  try {
    const rows = communityRows;
    initialCommunities = rows.map((row) => {
      const memberCount = Number(row.member_count ?? 0) || 0;
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        category: row.category ?? null,
        tagline: row.tagline ?? null,
        cover_image: row.cover_image ?? null,
        avatar_url: row.avatar_url ?? null,
        member_count: memberCount,
        online_members: 0,
        trending_score: 0,
        verified: isCommunityVerified({
          is_featured: Boolean(row.is_featured),
          member_count: memberCount,
        }),
        href: `/communities/${row.slug}`,
        join_href: `/communities/${row.slug}/subscribe`,
      };
    });
  } catch (err) {
    console.error("[communities] public catalog preload failed:", err);
  }

  initialPosts = feedResult.posts;
  initialNextCursor = feedResult.next_cursor;

  return (
    <FeedPageContent
      initialCommunities={initialCommunities}
      initialPosts={initialPosts}
      initialNextCursor={initialNextCursor}
      tag={tag}
    />
  );
}
