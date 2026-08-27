import { FeedPageContent } from "@/components/feed/FeedPageContent";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";
import { isCommunityVerified } from "@/lib/community/trending-score";
import { getHomepageCommunities } from "@/services/platform";

export default async function FeedPage() {
  let initialCommunities: TrendingCommunity[] = [];
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

  return <FeedPageContent initialCommunities={initialCommunities} />;
}
