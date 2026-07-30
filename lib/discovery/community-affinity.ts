/**
 * Community affinity recommendations — deterministic scoring from real user signals.
 */

import { communityTrendingScore } from "@/lib/community/trending-score";
import type { DiscoveryHit } from "@/lib/discovery/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

type CommunityRow = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  avatar_url: string | null;
  category: string | null;
  tags: string[] | null;
  member_count: number | null;
  post_count: number | null;
  is_featured: boolean | null;
  created_at: string | null;
  owner_id: string;
};

type UserSignals = {
  joinedIds: Set<string>;
  categories: Set<string>;
  tags: Set<string>;
  viewedCommunityIds: Set<string>;
  viewedCreatorIds: Set<string>;
  engagedCommunityIds: Map<string, number>;
  searchTerms: string[];
  activeCommunityIds: Set<string>;
  peerUserIds: string[];
};

function admin() {
  return createServiceRoleClient() as any;
}

function normalizeTag(value: string): string {
  return value.trim().toLowerCase().replace(/^#/, "");
}

function overlapRatio(candidate: Set<string>, profile: Set<string>): number {
  if (profile.size === 0 || candidate.size === 0) return 0;
  let hits = 0;
  for (const item of candidate) {
    if (profile.has(item)) hits += 1;
  }
  return hits / Math.max(candidate.size, profile.size);
}

function bumpEngagement(map: Map<string, number>, communityId: string, weight: number) {
  map.set(communityId, (map.get(communityId) ?? 0) + weight);
}

async function loadUserSignals(userId: string): Promise<UserSignals> {
  const db = admin();
  const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const [
    membershipsRes,
    viewsRes,
    likesRes,
    commentsRes,
    searchesRes,
    pointsRes,
    followsRes,
  ] = await Promise.all([
    db
      .from("community_memberships")
      .select("community_id, communities(category, tags)")
      .eq("user_id", userId)
      .eq("status", "active"),
    db
      .from("discovery_views")
      .select("entity_type, entity_id, metadata")
      .eq("user_id", userId)
      .gte("viewed_at", since30)
      .order("viewed_at", { ascending: false })
      .limit(200),
    db
      .from("community_post_likes")
      .select("post_id, created_at")
      .eq("user_id", userId)
      .gte("created_at", since30)
      .limit(300),
    db
      .from("community_post_comments")
      .select("post_id, created_at")
      .eq("author_id", userId)
      .gte("created_at", since30)
      .limit(300),
    db
      .from("search_history")
      .select("query")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(40),
    db
      .from("member_points")
      .select("community_id, last_active_at")
      .eq("user_id", userId)
      .gte("last_active_at", since14)
      .limit(80),
    db.from("user_follows").select("following_id").eq("follower_id", userId).limit(120),
  ]);

  const joinedIds = new Set<string>();
  const categories = new Set<string>();
  const tags = new Set<string>();

  for (const row of membershipsRes.data ?? []) {
    joinedIds.add(row.community_id);
    const community = row.communities as { category?: string | null; tags?: string[] | null } | null;
    if (community?.category) categories.add(normalizeTag(community.category));
    for (const tag of community?.tags ?? []) {
      if (typeof tag === "string" && tag.trim()) tags.add(normalizeTag(tag));
    }
  }

  const viewedCommunityIds = new Set<string>();
  const viewedCreatorIds = new Set<string>();
  for (const row of viewsRes.data ?? []) {
    if (row.entity_type === "community" && row.entity_id) {
      viewedCommunityIds.add(String(row.entity_id));
    }
    if (row.entity_type === "creator" && row.entity_id) {
      viewedCreatorIds.add(String(row.entity_id));
    }
    const metaCommunityId = row.metadata?.communityId;
    if (typeof metaCommunityId === "string" && metaCommunityId) {
      viewedCommunityIds.add(metaCommunityId);
    }
  }

  const postIds = new Set<string>();
  for (const row of likesRes.data ?? []) {
    if (row.post_id) postIds.add(row.post_id);
  }
  for (const row of commentsRes.data ?? []) {
    if (row.post_id) postIds.add(row.post_id);
  }

  const postCommunityMap = new Map<string, string>();
  if (postIds.size > 0) {
    const { data: posts } = await db
      .from("community_posts")
      .select("id, community_id")
      .in("id", Array.from(postIds));
    for (const post of posts ?? []) {
      if (post.id && post.community_id) {
        postCommunityMap.set(post.id, post.community_id);
      }
    }
  }

  const engagedCommunityIds = new Map<string, number>();
  for (const row of likesRes.data ?? []) {
    const communityId = postCommunityMap.get(row.post_id);
    if (communityId) bumpEngagement(engagedCommunityIds, communityId, 2);
  }
  for (const row of commentsRes.data ?? []) {
    const communityId = postCommunityMap.get(row.post_id);
    if (communityId) bumpEngagement(engagedCommunityIds, communityId, 3);
  }
  for (const communityId of viewedCommunityIds) {
    bumpEngagement(engagedCommunityIds, communityId, 1);
  }

  const activeCommunityIds = new Set<string>();
  for (const row of pointsRes.data ?? []) {
    if (row.community_id) activeCommunityIds.add(row.community_id);
  }

  const searchTerms = (searchesRes.data ?? [])
    .map((row: { query?: string }) => row.query?.trim().toLowerCase())
    .filter((q: string | undefined): q is string => Boolean(q && q.length >= 2));

  const peerUserIds = (followsRes.data ?? [])
    .map((row: { following_id?: string }) => row.following_id)
    .filter((id: string | undefined): id is string => Boolean(id));

  return {
    joinedIds,
    categories,
    tags,
    viewedCommunityIds,
    viewedCreatorIds,
    engagedCommunityIds,
    searchTerms,
    activeCommunityIds,
    peerUserIds,
  };
}

async function loadRecentJoinCounts(): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data } = await admin()
    .from("community_memberships")
    .select("community_id")
    .eq("status", "active")
    .gte("subscribed_at", since)
    .limit(5000);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.community_id, (map.get(row.community_id) ?? 0) + 1);
  }
  return map;
}

async function loadRecentPostCounts(): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 14 * 86400000).toISOString();
  const { data } = await admin()
    .from("community_posts")
    .select("community_id")
    .eq("is_published", true)
    .gte("created_at", since)
    .limit(5000);

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.community_id, (map.get(row.community_id) ?? 0) + 1);
  }
  return map;
}

async function loadPeerMembershipOverlap(
  peerUserIds: string[],
  excludeIds: Set<string>
): Promise<Map<string, number>> {
  const overlap = new Map<string, number>();
  if (peerUserIds.length === 0) return overlap;

  const { data } = await admin()
    .from("community_memberships")
    .select("community_id, user_id")
    .in("user_id", peerUserIds.slice(0, 80))
    .eq("status", "active")
    .limit(2000);

  for (const row of data ?? []) {
    if (excludeIds.has(row.community_id)) continue;
    overlap.set(row.community_id, (overlap.get(row.community_id) ?? 0) + 1);
  }
  return overlap;
}

function scoreCommunity(
  community: CommunityRow,
  signals: UserSignals,
  recentJoins: Map<string, number>,
  recentPosts: Map<string, number>,
  peerOverlap: Map<string, number>
): number {
  const candidateTags = new Set<string>();
  if (community.category) candidateTags.add(normalizeTag(community.category));
  for (const tag of community.tags ?? []) {
    if (typeof tag === "string" && tag.trim()) candidateTags.add(normalizeTag(tag));
  }

  const categoryOverlap =
    community.category && signals.categories.has(normalizeTag(community.category)) ? 1 : 0;
  const tagOverlap = overlapRatio(candidateTags, signals.tags);
  const affinity = categoryOverlap * 18 + tagOverlap * 12;

  const ageDays = community.created_at
    ? (Date.now() - new Date(community.created_at).getTime()) / 86400000
    : 365;
  const freshness = ageDays <= 30 ? 10 : ageDays <= 90 ? 7 : ageDays <= 180 ? 4 : 1;

  const joins = recentJoins.get(community.id) ?? 0;
  const growth = Math.min(15, Math.log1p(joins) * 5 + Math.log1p(community.member_count ?? 0) * 2);

  const posts = Number(community.post_count ?? 0) || 0;
  const recentPostActivity = recentPosts.get(community.id) ?? 0;
  const activity = Math.min(15, Math.log1p(posts) * 3 + Math.log1p(recentPostActivity) * 4);

  const friends = Math.min(15, (peerOverlap.get(community.id) ?? 0) * 4);

  const engagement = Math.min(10, (signals.engagedCommunityIds.get(community.id) ?? 0) * 2);
  const activeBoost = signals.activeCommunityIds.has(community.id) ? 3 : 0;

  const creatorRelevance =
    signals.viewedCreatorIds.has(community.owner_id) ||
    signals.viewedCommunityIds.has(community.id)
      ? 8
      : 0;

  const searchMatch = signals.searchTerms.some((term) => {
    const haystack = `${community.name} ${community.tagline ?? ""} ${community.category ?? ""} ${(community.tags ?? []).join(" ")}`.toLowerCase();
    return haystack.includes(term);
  })
    ? 6
    : 0;

  const trending = communityTrendingScore({
    member_count: community.member_count,
    post_count: community.post_count,
    is_featured: community.is_featured,
    recent_posts: recentPostActivity,
    recent_joins: joins,
    online_members: 0,
  });

  const trendingMultiplier = Math.min(12, trending * 0.35);

  return (
    affinity +
    freshness +
    growth +
    activity +
    friends +
    engagement +
    activeBoost +
    creatorRelevance +
    searchMatch +
    trendingMultiplier
  );
}

export async function getRecommendedCommunitiesForYou(
  userId: string,
  limit: number
): Promise<DiscoveryHit[]> {
  const boundedLimit = Math.min(Math.max(limit, 1), 24);
  const signals = await loadUserSignals(userId);

  const [recentJoins, recentPosts, peerOverlap, candidatesRes] = await Promise.all([
    loadRecentJoinCounts(),
    loadRecentPostCounts(),
    loadPeerMembershipOverlap(signals.peerUserIds, signals.joinedIds),
    admin()
      .from("communities")
      .select(
        "id, name, slug, tagline, avatar_url, category, tags, member_count, post_count, is_featured, created_at, owner_id"
      )
      .eq("is_active", true)
      .order("member_count", { ascending: false })
      .limit(120),
  ]);

  const candidates = ((candidatesRes.data ?? []) as CommunityRow[]).filter(
    (c) => !signals.joinedIds.has(c.id)
  );

  const scored = candidates
    .map((community) => {
      const score = scoreCommunity(
        community,
        signals,
        recentJoins,
        recentPosts,
        peerOverlap
      );
      return {
        id: community.id,
        entityType: "community" as const,
        title: community.name,
        subtitle: community.tagline ?? `${community.member_count ?? 0} members`,
        href: `/communities/${community.slug}`,
        imageUrl: community.avatar_url,
        score: Math.round(score * 10) / 10,
        meta: {
          source: "affinity",
          category: community.category,
          member_count: community.member_count,
          recent_joins: recentJoins.get(community.id) ?? 0,
          friend_overlap: peerOverlap.get(community.id) ?? 0,
        },
      } satisfies DiscoveryHit;
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, boundedLimit);

  return scored;
}
