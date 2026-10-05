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

/** Cap each discover rail so a saturated DB cannot hold the route for minutes. */
const RAIL_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(fallback);
      });
  });
}

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

/**
 * Lightweight fallback when the trending RPC is unavailable.
 * Uses maintained community counters only — does not scan posts/memberships
 * (previous scan of 2000+ rows contributed to production statement timeouts).
 */
async function fetchTrendingViaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<TrendingCommunityRow[]> {
  const { data: communities } = await supabase
    .from("communities")
    .select(
      "id, name, slug, category, tagline, description, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at, settings, is_free, monthly_price, currency",
    )
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .is("archived_at", null)
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(40);

  return (communities ?? [])
    .filter(communityIsPubliclyDiscoverable)
    .map((c) => {
      const trending_score = communityTrendingScore({
        member_count: c.member_count,
        post_count: c.post_count,
        is_featured: c.is_featured,
        recent_posts: 0,
        recent_joins: 0,
        online_members: 0,
      });
      return {
        ...c,
        online_members: 0,
        trending_score,
      } satisfies TrendingCommunityRow;
    })
    .sort((a, b) => (b.trending_score ?? 0) - (a.trending_score ?? 0))
    .slice(0, 8);
}

/** GET — discover rails for the Creator OS home feed. */
export async function GET(req: Request) {
  const supabase = await createClient();
  // Skip auth round-trip for anonymous visitors (cookie-less) — popular-users
  // exclusion is the only consumer of user.id here.
  const hasSessionCookie = (req.headers.get("cookie") || "").includes("sb-");
  let user: { id: string } | null = null;
  if (hasSessionCookie) {
    const auth = await withTimeout(
      supabase.auth.getUser().then((r) => r.data.user),
      800,
      null,
    );
    user = auth;
  }

  // Fan out independent rails; do not fail the whole payload if one is slow.
  let liveRows: Awaited<ReturnType<typeof loadFeedSidebarLiveNow>> = [];
  let popularUsers: Awaited<ReturnType<typeof loadFeedSidebarPopularUsers>> = [];
  let trendingRows: TrendingCommunityRow[] = [];

  const [liveResult, popularResult, trendingResult] = await Promise.allSettled([
    withTimeout(loadFeedSidebarLiveNow(8), RAIL_TIMEOUT_MS, []),
    withTimeout(loadFeedSidebarPopularUsers(user?.id ?? null), RAIL_TIMEOUT_MS, []),
    withTimeout(
      (async () => {
        const rpc = await (supabase as any).rpc("get_trending_communities", {
          p_limit: 24,
        });
        if (!rpc.error && Array.isArray(rpc.data)) {
          return rpc.data as TrendingCommunityRow[];
        }
        return fetchTrendingViaFallback(supabase);
      })(),
      RAIL_TIMEOUT_MS,
      [] as TrendingCommunityRow[],
    ),
  ]);
  if (liveResult.status === "fulfilled") liveRows = liveResult.value;
  if (popularResult.status === "fulfilled") popularUsers = popularResult.value;
  if (trendingResult.status === "fulfilled") trendingRows = trendingResult.value;

  // If the RPC/fallback timed out empty, try the light counter-based list once more
  // with its own short budget (priority communities still fill below).
  if (!trendingRows.length) {
    trendingRows = await withTimeout(
      fetchTrendingViaFallback(supabase),
      1_200,
      [] as TrendingCommunityRow[],
    );
  }

  // Single enrichment pass: visibility filter + display copy (was 2 round-trips).
  if (trendingRows.length) {
    const ids = trendingRows.map((row) => row.id);
    const { data: enrichRows } = await supabase
      .from("communities")
      .select(
        "id, is_private, is_active, visibility, visibility_mode, archived_at, tagline, description, settings, is_free, monthly_price, currency, is_featured",
      )
      .in("id", ids);
    const allowed = new Set(
      (enrichRows ?? []).filter(communityIsPubliclyDiscoverable).map((row) => row.id),
    );
    const copyById = new Map(
      ((enrichRows ?? []) as Array<{
        id: string;
        tagline: string | null;
        description: string | null;
        settings?: unknown;
        is_free?: boolean | null;
        monthly_price?: number | null;
        currency?: string | null;
        is_featured?: boolean | null;
      }>).map((row) => [row.id, row]),
    );
    trendingRows = trendingRows
      .filter((row) => allowed.has(row.id))
      .map((row) => {
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
