import { FeedPageContent } from "@/components/feed/FeedPageContent";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";
import type { ApiPost } from "@/components/feed/FeedPostCard";
import { isCommunityVerified } from "@/lib/community/trending-score";
import { loadPublicDiscoveryFeed } from "@/lib/feed/load-public-discovery-feed";
import { createClient } from "@/lib/supabase/server";
import { getHomepageCommunities } from "@/services/platform";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  let initialCommunities: TrendingCommunity[] = [];
  let initialPosts: ApiPost[] = [];
  try {
    const rows = await getHomepageCommunities(8);
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
          is_featured: false,
          member_count: memberCount,
        }),
        href: `/communities/${row.slug}`,
        join_href: `/communities/${row.slug}/subscribe`,
      };
    });
  } catch (err) {
    console.error("[communities] public catalog preload failed:", err);
  }

  try {
    const supabase = await createClient();
    const feed = await loadPublicDiscoveryFeed(supabase, { filter: "for-you", limit: 20 });
    if (feed.ok) initialPosts = feed.posts as ApiPost[];
    else console.error("[communities] public feed preload failed:", feed.error);
  } catch (err) {
    console.error("[communities] public feed preload failed:", err);
  }

  return (
    <FeedPageContent
      initialCommunities={initialCommunities}
      initialPosts={initialPosts}
    />
  );
}
