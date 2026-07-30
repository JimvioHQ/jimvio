/**
 * Community trending score — mirrors SQL `community_trending_score`.
 * Used as an API fallback when the RPC is unavailable.
 */

export type TrendingCommunityInput = {
  member_count?: number | null;
  post_count?: number | null;
  is_featured?: boolean | null;
  recent_posts?: number | null;
  recent_joins?: number | null;
  online_members?: number | null;
};

export function communityTrendingScore(input: TrendingCommunityInput): number {
  const members = Math.max(0, Number(input.member_count ?? 0) || 0);
  const posts = Math.max(0, Number(input.post_count ?? 0) || 0);
  const recentPosts = Math.max(0, Number(input.recent_posts ?? 0) || 0);
  const recentJoins = Math.max(0, Number(input.recent_joins ?? 0) || 0);
  const online = Math.max(0, Number(input.online_members ?? 0) || 0);
  const featured = Boolean(input.is_featured);

  return (
    Math.log1p(members) * 3 +
    Math.log1p(posts) * 2 +
    Math.log1p(recentPosts) * 4 +
    Math.log1p(recentJoins) * 3.5 +
    Math.log1p(online) * 2.5 +
    (featured ? 8 : 0)
  );
}

export function isCommunityVerified(input: {
  is_featured?: boolean | null;
  member_count?: number | null;
}): boolean {
  return Boolean(input.is_featured) || (Number(input.member_count ?? 0) || 0) >= 100;
}
