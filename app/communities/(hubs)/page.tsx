import type { Metadata } from "next";
import { FeedPageContent } from "@/components/feed/FeedPageContent";
import { normalizeHashtagQuery } from "@/lib/feed/hashtag-query";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata("communities");
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";
import type { ApiPost } from "@/components/feed/FeedPostCard";
import { isCommunityVerified } from "@/lib/community/trending-score";
import { loadHubFeedSsr } from "@/lib/feed/load-hub-feed-ssr";
import { getHomepageCommunities } from "@/services/platform";
import { cookies } from "next/headers";
import { FEED_HEAD_COOKIE, parseFeedAvoidIds } from "@/lib/feed/feed-session-head";
import { getHubDiscoverPayloadForSsr } from "@/lib/feed/load-hub-discover";

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
  // Previous session head (cookie) → this session opens with different posts.
  const avoidIds = tag ? [] : parseFeedAvoidIds((await cookies()).get(FEED_HEAD_COOKIE)?.value);
  // Feed, catalog fallback and discover rails load in parallel; the discover
  // rails are cached and bounded so they never hold the feed back.
  const [communityRows, feedResult, discover] = await Promise.all([
    getHomepageCommunities(8).catch((err) => {
      console.error("[communities] public catalog preload failed:", err);
      return [] as Awaited<ReturnType<typeof getHomepageCommunities>>;
    }),
    loadHubFeedSsr({ filter: "for-you", limit: 20, tag, avoidIds }).catch((err) => {
      console.error("[communities] hub feed preload failed:", err);
      return {
        posts: [] as ApiPost[],
        next_cursor: null as string | null,
        session_cursor: null as string | null,
      };
    }),
    getHubDiscoverPayloadForSsr(1_200),
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
        verified: isCommunityVerified({ owner_verified: row.owner_verified === true }),
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
      initialCommunities={discover?.communities?.length ? discover.communities : initialCommunities}
      initialPosts={initialPosts}
      initialNextCursor={initialNextCursor}
      initialSessionCursor={feedResult.session_cursor ?? null}
      initialAvoidIds={avoidIds}
      initialDiscover={discover}
      tag={tag}
    />
  );
}
