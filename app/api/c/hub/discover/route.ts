import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  communityTrendingScore,
  isCommunityVerified,
} from "@/lib/community/trending-score";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import {
  loadFeedSidebarLiveNow,
  loadFeedSidebarPopularUsers,
} from "@/lib/feed/load-feed-sidebar";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";
import { PRIORITY_TRENDING_COMMUNITY_SLUGS } from "@/lib/community/discovery-priorities";
import { selectDiscoveryCommunities } from "@/lib/community/discovery-selection";

export const dynamic = "force-dynamic";

type TrendingCommunityRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  tagline?: string | null;
  description?: string | null;
  cover_image: string | null;
  avatar_url: string | null;
  member_count: number | null;
  post_count?: number | null;
  is_featured: boolean | null;
  online_members: number | null;
  trending_score: number | null;
};

function mapCommunity(row: TrendingCommunityRow & { settings?: unknown }) {
  const memberCount = resolveCommunityMemberCount({
    slug: row.slug,
    member_count: row.member_count,
    settings: row.settings,
  });
  const onlineMembers = Number(row.online_members ?? 0) || 0;
  const verified = isCommunityVerified({
    is_featured: row.is_featured,
    member_count: memberCount,
  });
  const tagline =
    (typeof row.tagline === "string" && row.tagline.trim()) ||
    (typeof row.description === "string" && row.description.trim()) ||
    null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    tagline,
    cover_image: row.cover_image,
    avatar_url: row.avatar_url,
    member_count: memberCount,
    online_members: onlineMembers,
    trending_score: Number(row.trending_score ?? 0) || 0,
    verified,
    is_featured: Boolean(row.is_featured),
    is_free: (row as { is_free?: boolean | null }).is_free !== false,
    monthly_price: (row as { monthly_price?: number | null }).monthly_price ?? null,
    currency: (row as { currency?: string | null }).currency ?? null,
    href: `/communities/${row.slug}`,
    join_href: `/communities/${row.slug}/subscribe`,
  };
}

async function fetchTrendingViaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<TrendingCommunityRow[]> {
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const onlineCutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  const [{ data: communities }, { data: recentPosts }, { data: recentJoins }, { data: onlineRows }] =
    await Promise.all([
      supabase
        .from("communities")
        .select(
          "id, name, slug, category, tagline, description, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at"
        )
        .eq("is_active", true)
        .or("is_private.eq.false,is_private.is.null")
        .order("member_count", { ascending: false })
        .limit(40),
      supabase
        .from("community_posts")
        .select("community_id")
        .eq("is_published", true)
        .gte("created_at", since)
        .limit(2000),
      supabase
        .from("community_memberships")
        .select("community_id")
        .eq("status", "active")
        .gte("subscribed_at", since)
        .limit(2000),
      supabase
        .from("member_points")
        .select("community_id")
        .gte("last_active_at", onlineCutoff)
        .limit(2000),
    ]);

  const countBy = (rows: Array<{ community_id: string }> | null) => {
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      map.set(row.community_id, (map.get(row.community_id) ?? 0) + 1);
    }
    return map;
  };

  const postsMap = countBy(recentPosts as Array<{ community_id: string }> | null);
  const joinsMap = countBy(recentJoins as Array<{ community_id: string }> | null);
  const onlineMap = countBy(onlineRows as Array<{ community_id: string }> | null);

  return (communities ?? [])
    .filter(communityIsPubliclyDiscoverable)
    .map((c) => {
      const recent_posts = postsMap.get(c.id) ?? 0;
      const recent_joins = joinsMap.get(c.id) ?? 0;
      const online_members = onlineMap.get(c.id) ?? 0;
      const trending_score = communityTrendingScore({
        member_count: c.member_count,
        post_count: c.post_count,
        is_featured: c.is_featured,
        recent_posts,
        recent_joins,
        online_members,
      });
      return {
        ...c,
        online_members,
        trending_score,
      } satisfies TrendingCommunityRow;
    })
    .sort((a, b) => (b.trending_score ?? 0) - (a.trending_score ?? 0))
    .slice(0, 8);
}

/** GET — discover rails for the Creator OS home feed. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let liveRows: Awaited<ReturnType<typeof loadFeedSidebarLiveNow>> = [];
  let popularUsers: Awaited<ReturnType<typeof loadFeedSidebarPopularUsers>> = [];
  const [liveResult, popularResult] = await Promise.allSettled([
    loadFeedSidebarLiveNow(8),
    loadFeedSidebarPopularUsers(user?.id ?? null),
  ]);
  if (liveResult.status === "fulfilled") liveRows = liveResult.value;
  if (popularResult.status === "fulfilled") popularUsers = popularResult.value;

  let trendingRows: TrendingCommunityRow[] = [];
  const rpc = await (supabase as any).rpc("get_trending_communities", {
    p_limit: 24,
  });

  if (rpc.error || !Array.isArray(rpc.data)) {
    try {
      trendingRows = await fetchTrendingViaFallback(supabase);
    } catch {
      trendingRows = [];
    }
  } else {
    trendingRows = rpc.data as TrendingCommunityRow[];
  }

  if (trendingRows.length) {
    const ids = trendingRows.map((row) => row.id);
    const { data: visRows } = await supabase
      .from("communities")
      .select("id, is_private, is_active, visibility, visibility_mode, archived_at")
      .in("id", ids);
    const allowed = new Set(
      (visRows ?? []).filter(communityIsPubliclyDiscoverable).map((row) => row.id),
    );
    trendingRows = trendingRows.filter((row) => allowed.has(row.id));
  }

  // Enrich display copy (tagline/description) without changing ranking.
  if (trendingRows.length) {
    const ids = trendingRows.map((row) => row.id);
    const { data: copyRows } = await supabase
      .from("communities")
      .select("id, tagline, description, settings, is_free, monthly_price, currency, is_featured")
      .in("id", ids);
    const copyById = new Map(
      ((copyRows ?? []) as Array<{
        id: string;
        tagline: string | null;
        description: string | null;
        settings?: unknown;
        is_free?: boolean | null;
        monthly_price?: number | null;
        currency?: string | null;
        is_featured?: boolean | null;
      }>).map((row) => [row.id, row])
    );
    trendingRows = trendingRows.map((row) => {
      const copy = copyById.get(row.id);
      return copy
        ? {
            ...row,
            tagline: row.tagline ?? copy.tagline,
            description: row.description ?? copy.description,
            settings: (row as { settings?: unknown }).settings ?? copy.settings,
            is_featured: row.is_featured ?? copy.is_featured ?? null,
            is_free: copy.is_free,
            monthly_price: copy.monthly_price,
            currency: copy.currency,
          }
        : row;
    });
  }

  trendingRows = trendingRows.slice(0, 24);

  // Ensure priority communities (e.g. P7 PROVIDER) are considered even if
  // they fall outside the activity RPC window.
  if (PRIORITY_TRENDING_COMMUNITY_SLUGS.length) {
    const have = new Set(trendingRows.map((r) => r.slug));
    const missing = PRIORITY_TRENDING_COMMUNITY_SLUGS.filter((s) => !have.has(s));
    if (missing.length) {
      const { data: priorityRows } = await supabase
        .from("communities")
        .select(
          "id, name, slug, category, tagline, description, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at, settings, is_free, monthly_price, currency",
        )
        .in("slug", missing)
        .eq("is_active", true);
      for (const row of priorityRows ?? []) {
        if (!communityIsPubliclyDiscoverable(row)) continue;
        trendingRows.push({
          ...(row as unknown as TrendingCommunityRow),
          online_members: 0,
          trending_score: communityTrendingScore({
            member_count: row.member_count,
            post_count: row.post_count,
            is_featured: row.is_featured,
          }),
        });
      }
    }
  }

  const qualityRows = selectDiscoveryCommunities(
    trendingRows.filter((row) => {
      if (!row.name?.trim() || !row.slug?.trim()) return false;
      if (row.is_featured) return true;
      const members = Number(row.member_count ?? 0) || 0;
      const posts = Number(row.post_count ?? 0) || 0;
      const score = Number(row.trending_score ?? 0) || 0;
      return members >= 1 || posts >= 1 || score > 0;
    }),
    8,
  );

  return NextResponse.json({
    communities: qualityRows.map((row) =>
      mapCommunity(row as TrendingCommunityRow & { settings?: unknown })
    ),
    live: liveRows.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: "Live now",
      href: s.href,
      image: s.thumbnailUrl ?? s.hostAvatarUrl,
      badge: "Live",
      hostName: s.hostName,
      hostAvatarUrl: s.hostAvatarUrl,
      viewerCount: s.viewerCount,
      thumbnailUrl: s.thumbnailUrl,
    })),
    popularUsers,
  });
}
