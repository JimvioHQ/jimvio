import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  hasSupabaseSecretKey,
} from "@/lib/supabase/service-role";
import {
  communityTrendingScore,
  isCommunityVerified,
} from "@/lib/community/trending-score";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import {
  loadFeedSidebarLiveNow,
  loadFeedSidebarPopularUsers,
  type FeedSidebarLiveCreator,
  type FeedSidebarPopularUser,
} from "@/lib/feed/load-feed-sidebar";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";
import { PRIORITY_TRENDING_COMMUNITY_SLUGS } from "@/lib/community/discovery-priorities";
import { selectDiscoveryCommunities } from "@/lib/community/discovery-selection";
import {
  UpstreamUnavailableError,
  isAbortLikeError,
} from "@/lib/feed/upstream-error";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const DISCOVER_BUDGET_MS = 10_000;
const SIDEBAR_BUDGET_MS = 2_000;

type Db = {
  // Service-role and cookie clients share PostgREST surface; keep loose to avoid
  // incompatible generic unions across @supabase/ssr vs supabase-js.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (relation: string) => any;
};

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
 * Lightweight trending list using maintained counters only.
 * Privacy is enforced in application code (service-role read path).
 */
async function fetchTrendingViaFallback(
  db: Db,
  signal: AbortSignal,
): Promise<TrendingCommunityRow[]> {
  const { data: communities, error } = await db
    .from("communities")
    .select(
      "id, name, slug, category, tagline, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at, settings, is_free, monthly_price, currency",
    )
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .is("archived_at", null)
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(40)
    .abortSignal(signal);

  if (signal.aborted || isAbortLikeError(error)) {
    throw new UpstreamUnavailableError(
      "Discovery query timed out waiting for the database",
    );
  }
  if (error) {
    throw new UpstreamUnavailableError(error.message);
  }

  return ((communities ?? []) as Array<Record<string, unknown> & {
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
    is_private?: boolean | null;
    is_active?: boolean | null;
    visibility?: string | null;
    visibility_mode?: string | null;
    archived_at?: string | null;
    settings?: unknown;
    is_free?: boolean | null;
    monthly_price?: number | null;
    currency?: string | null;
  }>)
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

async function fetchPriorityCommunities(
  db: Db,
  missing: string[],
  signal: AbortSignal,
): Promise<TrendingCommunityRow[]> {
  if (!missing.length) return [];
  const { data: priorityRows, error } = await db
    .from("communities")
    .select(
      "id, name, slug, category, tagline, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at, settings, is_free, monthly_price, currency",
    )
    .in("slug", missing)
    .eq("is_active", true)
    .abortSignal(signal);

  if (signal.aborted || isAbortLikeError(error)) {
    throw new UpstreamUnavailableError(
      "Discovery priority query timed out waiting for the database",
    );
  }
  if (error) {
    throw new UpstreamUnavailableError(error.message);
  }

  const out: TrendingCommunityRow[] = [];
  for (const row of priorityRows ?? []) {
    if (!communityIsPubliclyDiscoverable(row)) continue;
    out.push({
      ...(row as unknown as TrendingCommunityRow),
      online_members: 0,
      trending_score: communityTrendingScore({
        member_count: row.member_count,
        post_count: row.post_count,
        is_featured: row.is_featured,
      }),
    });
  }
  return out;
}

/** GET — discover rails for the Creator OS home feed. */
export async function GET(req: Request) {
  const budget = AbortSignal.timeout(DISCOVER_BUDGET_MS);
  // Service-role for public discovery metadata only — privacy filtered in-app.
  // Avoids RLS re-evaluation cost under connection saturation.
  const db: Db = hasSupabaseSecretKey()
    ? createServiceRoleClient()
    : await createClient();

  let trendingRows: TrendingCommunityRow[] = [];
  try {
    trendingRows = await fetchTrendingViaFallback(db, budget);

    if (PRIORITY_TRENDING_COMMUNITY_SLUGS.length && !budget.aborted) {
      const have = new Set(trendingRows.map((r) => r.slug));
      const missing = PRIORITY_TRENDING_COMMUNITY_SLUGS.filter((s) => !have.has(s));
      if (missing.length) {
        const priorityRows = await fetchPriorityCommunities(db, missing, budget);
        trendingRows = [...trendingRows, ...priorityRows];
      }
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Discovery temporarily unavailable";
    console.error("[discover] upstream failure:", message);
    return NextResponse.json(
      {
        error: "upstream_unavailable",
        message,
        communities: null,
        live: null,
        popularUsers: null,
      },
      { status: 503 },
    );
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

  // Empty after a successful query is legitimate only if the DB truly has no
  // discoverable communities — which production does not. Treat as failure.
  if (!qualityRows.length) {
    console.error("[discover] empty result after successful queries");
    return NextResponse.json(
      {
        error: "upstream_unavailable",
        message: "Discovery returned no communities from a non-empty database",
        communities: null,
        live: null,
        popularUsers: null,
      },
      { status: 503 },
    );
  }

  // Optional sidebar rails — never block communities payload.
  let liveRows: FeedSidebarLiveCreator[] = [];
  let popularUsers: FeedSidebarPopularUser[] = [];
  if (!budget.aborted) {
    const sidebarSignal = AbortSignal.timeout(SIDEBAR_BUDGET_MS);
    const hasSessionCookie = (req.headers.get("cookie") || "").includes("sb-");
    let excludeUserId: string | null = null;
    if (hasSessionCookie) {
      try {
        const userClient = await createClient();
        const auth = await Promise.race([
          userClient.auth.getUser().then((r) => r.data.user),
          new Promise<null>((resolve) => {
            sidebarSignal.addEventListener("abort", () => resolve(null), { once: true });
          }),
        ]);
        excludeUserId = auth?.id ?? null;
      } catch {
        excludeUserId = null;
      }
    }

    const [liveSettled, popularSettled] = await Promise.allSettled([
      Promise.race([
        loadFeedSidebarLiveNow(8),
        new Promise<FeedSidebarLiveCreator[]>((resolve) => {
          sidebarSignal.addEventListener("abort", () => resolve([]), { once: true });
        }),
      ]),
      Promise.race([
        loadFeedSidebarPopularUsers(excludeUserId),
        new Promise<FeedSidebarPopularUser[]>((resolve) => {
          sidebarSignal.addEventListener("abort", () => resolve([]), { once: true });
        }),
      ]),
    ]);
    if (liveSettled.status === "fulfilled") liveRows = liveSettled.value;
    if (popularSettled.status === "fulfilled") popularUsers = popularSettled.value;
  }

  return NextResponse.json(
    {
      communities: qualityRows.map((row) =>
        mapCommunity(row as TrendingCommunityRow & { settings?: unknown }),
      ),
      live: liveRows.map((s: FeedSidebarLiveCreator) => ({
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
    },
    {
      headers: {
        // Public discovery metadata — short CDN cache; never private auth data.
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
      },
    },
  );
}
