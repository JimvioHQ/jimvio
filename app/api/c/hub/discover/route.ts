import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  communityTrendingScore,
  isCommunityVerified,
} from "@/lib/community/trending-score";

export const dynamic = "force-dynamic";

type TrendingCommunityRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  cover_image: string | null;
  avatar_url: string | null;
  member_count: number | null;
  post_count: number | null;
  is_featured: boolean | null;
  online_members: number | null;
  trending_score: number | null;
};

function mapCommunity(row: TrendingCommunityRow) {
  const memberCount = Number(row.member_count ?? 0) || 0;
  const onlineMembers = Number(row.online_members ?? 0) || 0;
  const verified = isCommunityVerified({
    is_featured: row.is_featured,
    member_count: memberCount,
  });

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category,
    cover_image: row.cover_image,
    avatar_url: row.avatar_url,
    member_count: memberCount,
    online_members: onlineMembers,
    trending_score: Number(row.trending_score ?? 0) || 0,
    verified,
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
          "id, name, slug, category, cover_image, avatar_url, member_count, post_count, is_featured"
        )
        .eq("is_active", true)
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

  let liveRows: Array<{
    id: string | number;
    title?: string | null;
  }> = [];
  try {
    const liveRes = await (supabase as any)
      .from("live_sessions")
      .select("id, title, status, community_id, host_user_id")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(6);
    liveRows = liveRes?.data ?? [];
  } catch {
    liveRows = [];
  }

  let trendingRows: TrendingCommunityRow[] = [];
  const rpc = await (supabase as any).rpc("get_trending_communities", {
    p_limit: 8,
  });

  if (!rpc.error && Array.isArray(rpc.data)) {
    trendingRows = rpc.data as TrendingCommunityRow[];
  } else {
    try {
      trendingRows = await fetchTrendingViaFallback(supabase);
    } catch {
      trendingRows = [];
    }
  }

  void user;

  return NextResponse.json({
    communities: trendingRows.map(mapCommunity),
    live: liveRows.map((s) => ({
      id: String(s.id),
      title: s.title || "Live room",
      subtitle: "Live now",
      href: `/communities/live/${s.id}`,
      image: null,
      badge: "Live",
    })),
  });
}
