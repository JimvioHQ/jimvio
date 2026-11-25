import "server-only";

import { unstable_cache } from "next/cache";
import {
  createServiceRoleClient,
  hasSupabaseSecretKey,
} from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import {
  communityTrendingScore,
  isCommunityVerified,
} from "@/lib/community/trending-score";
import { communityIsPubliclyDiscoverable } from "@/lib/community/join-policy";
import {
  loadFeedSidebarLiveNow,
  loadFeedSidebarPopularUsers,
  POPULAR_USER_COUNT,
  type FeedSidebarLiveCreator,
  type FeedSidebarPopularUser,
} from "@/lib/feed/load-feed-sidebar";
import { resolveCommunityMemberCount } from "@/lib/community/member-count";
import { loadVerifiedUserIds } from "@/lib/identity/verified-users";
import { PRIORITY_TRENDING_COMMUNITY_SLUGS } from "@/lib/community/discovery-priorities";
import { selectDiscoveryCommunities } from "@/lib/community/discovery-selection";
import {
  UpstreamUnavailableError,
  isAbortLikeError,
} from "@/lib/feed/upstream-error";
import type { TrendingCommunity } from "@/components/feed/FeedDiscoverRail";

/**
 * Hub discovery rails (Trending Communities, Popular Users, Live now).
 *
 * Public metadata only — identical for every viewer, so it is cached once
 * server-side and can be rendered in the first HTML response. Viewer-specific
 * filtering (hiding yourself from Popular Users) happens on the client.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (relation: string) => any };

const COMMUNITY_SELECT =
  "id, owner_id, name, slug, category, tagline, cover_image, avatar_url, member_count, post_count, is_featured, is_private, is_active, visibility, visibility_mode, archived_at, settings, is_free, monthly_price, currency";
const RECENT_POST_DAYS = 30;
/** One spare so the viewer can be hidden client-side and five still show. */
export const DISCOVER_POPULAR_USERS = POPULAR_USER_COUNT + 1;

type CommunityRow = {
  id: string;
  owner_id?: string | null;
  owner_verified?: boolean;
  name: string;
  slug: string;
  category: string | null;
  tagline?: string | null;
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
  online_members?: number | null;
  trending_score?: number | null;
};

export type HubDiscoverPayload = {
  communities: TrendingCommunity[];
  live: Array<
    FeedSidebarLiveCreator & {
      subtitle: string;
      image: string | null;
      badge: string;
    }
  >;
  popularUsers: FeedSidebarPopularUser[];
};

function mapCommunity(row: CommunityRow): TrendingCommunity {
  const memberCount = resolveCommunityMemberCount({
    slug: row.slug,
    member_count: row.member_count,
    settings: row.settings,
  });
  return {
    id: row.id,
    name: row.name,
    owner_verified: row.owner_verified === true,
    slug: row.slug,
    category: row.category,
    tagline: (typeof row.tagline === "string" && row.tagline.trim()) || null,
    cover_image: row.cover_image,
    avatar_url: row.avatar_url,
    member_count: memberCount,
    online_members: Number(row.online_members ?? 0) || 0,
    trending_score: Number(row.trending_score ?? 0) || 0,
    verified: isCommunityVerified({ owner_verified: row.owner_verified }),
    is_free: row.is_free !== false,
    monthly_price: row.monthly_price ?? null,
    currency: row.currency ?? null,
    href: `/communities/${row.slug}`,
    join_href: `/communities/${row.slug}/subscribe`,
  };
}

function assertOk(signal: AbortSignal, error: unknown, label: string) {
  if (signal.aborted || isAbortLikeError(error as never)) {
    throw new UpstreamUnavailableError(`${label} timed out waiting for the database`);
  }
  if (error) {
    const message = (error as { message?: string }).message ?? String(error);
    throw new UpstreamUnavailableError(message);
  }
}

/**
 * Real activity for the candidate set: active memberships and live posts in the
 * last 30 days. The maintained counters (member_count / post_count) are not
 * updated by every write path, so a new community could look empty and never
 * trend. These are real rows — nothing is estimated or inflated.
 */
async function loadRealActivity(
  db: Db,
  ids: string[],
  signal: AbortSignal,
): Promise<{ members: Map<string, number>; recentPosts: Map<string, number> } | null> {
  if (!ids.length) return { members: new Map(), recentPosts: new Map() };
  const since = new Date(Date.now() - RECENT_POST_DAYS * 86_400_000).toISOString();
  try {
    const [membersRes, postsRes] = await Promise.all([
      db
        .from("community_memberships")
        .select("community_id")
        .in("community_id", ids)
        .eq("status", "active")
        .limit(20_000)
        .abortSignal(signal),
      db
        .from("community_posts")
        .select("community_id")
        .in("community_id", ids)
        .eq("is_published", true)
        .is("deleted_at", null)
        .is("archived_at", null)
        .is("hidden_at", null)
        .gte("created_at", since)
        .limit(20_000)
        .abortSignal(signal),
    ]);
    if (membersRes.error || postsRes.error) return null;
    const tally = (rows: { community_id: string }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) m.set(r.community_id, (m.get(r.community_id) ?? 0) + 1);
      return m;
    };
    return { members: tally(membersRes.data), recentPosts: tally(postsRes.data) };
  } catch {
    // Activity is an enrichment — fall back to maintained counters.
    return null;
  }
}

/** Trending Communities: public, active, discoverable only. */
export async function loadTrendingCommunities(
  db: Db,
  signal: AbortSignal,
  limit = 8,
): Promise<TrendingCommunity[]> {
  const { data, error } = await db
    .from("communities")
    .select(COMMUNITY_SELECT)
    .eq("is_active", true)
    .or("is_private.eq.false,is_private.is.null")
    .is("archived_at", null)
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(40)
    .abortSignal(signal);
  assertOk(signal, error, "Discovery query");

  let rows = ((data ?? []) as CommunityRow[]).filter(communityIsPubliclyDiscoverable);

  const have = new Set(rows.map((r) => r.slug));
  const missing = PRIORITY_TRENDING_COMMUNITY_SLUGS.filter((s) => !have.has(s));
  if (missing.length) {
    const priority = await db
      .from("communities")
      .select(COMMUNITY_SELECT)
      .in("slug", missing)
      .eq("is_active", true)
      .abortSignal(signal);
    assertOk(signal, priority.error, "Discovery priority query");
    rows = [
      ...rows,
      ...((priority.data ?? []) as CommunityRow[]).filter(communityIsPubliclyDiscoverable),
    ];
  }

  const [activity, verifiedOwners] = await Promise.all([
    loadRealActivity(db, rows.map((r) => r.id), signal),
    loadVerifiedUserIds(db, rows.map((row) => row.owner_id ?? "")),
  ]);
  const scored = rows.map((row) => {
    const realMembers = activity?.members.get(row.id);
    const memberCount =
      realMembers != null ? realMembers : Number(row.member_count ?? 0) || 0;
    const recentPosts = activity?.recentPosts.get(row.id) ?? 0;
    return {
      ...row,
      owner_verified: Boolean(row.owner_id && verifiedOwners.has(row.owner_id)),
      member_count: memberCount,
      online_members: 0,
      trending_score: communityTrendingScore({
        member_count: memberCount,
        post_count: row.post_count,
        is_featured: row.is_featured,
        recent_posts: recentPosts,
        recent_joins: 0,
        online_members: 0,
      }),
      _recentPosts: recentPosts,
    };
  });

  const quality = scored.filter((row) => {
    if (!row.name?.trim() || !row.slug?.trim()) return false;
    if (row.is_featured) return true;
    return (
      row.member_count >= 1 ||
      (Number(row.post_count ?? 0) || 0) >= 1 ||
      row._recentPosts >= 1
    );
  });

  return selectDiscoveryCommunities(
    quality.sort((a, b) => (b.trending_score ?? 0) - (a.trending_score ?? 0)),
    limit,
  ).map((row) => mapCommunity(row));
}

function mapLive(s: FeedSidebarLiveCreator) {
  return {
    ...s,
    subtitle: "Live now",
    image: s.thumbnailUrl ?? s.hostAvatarUrl,
    badge: "Live",
  };
}

async function withBudget<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function getDiscoverDb(): Promise<Db> {
  return hasSupabaseSecretKey() ? createServiceRoleClient() : await createClient();
}

/** Uncached build — throws UpstreamUnavailableError when trending cannot load. */
export async function buildHubDiscoverPayload(): Promise<HubDiscoverPayload> {
  const db = await getDiscoverDb();
  const signal = AbortSignal.timeout(8_000);
  // Rails load in parallel; slow optional rails never block Trending.
  const [communities, liveRows, popularUsers] = await Promise.all([
    loadTrendingCommunities(db, signal),
    withBudget(loadFeedSidebarLiveNow(8), 2_500, [] as FeedSidebarLiveCreator[]),
    withBudget(
      loadFeedSidebarPopularUsers(null, DISCOVER_POPULAR_USERS),
      4_000,
      [] as FeedSidebarPopularUser[],
    ),
  ]);
  if (!communities.length) {
    throw new UpstreamUnavailableError(
      "Discovery returned no communities from a non-empty database",
    );
  }
  return { communities, live: liveRows.map(mapLive), popularUsers };
}

const cachedPayload = unstable_cache(
  async () => {
    const payload = await buildHubDiscoverPayload();
    // Never cache a partially failed sidebar for long: an empty optional rail
    // is rebuilt on the next request instead of being served for the TTL.
    if (!payload.popularUsers.length) {
      throw new UpstreamUnavailableError("popular users unavailable");
    }
    return payload;
  },
  ["hub-discover-v2"],
  { revalidate: 30, tags: ["hub-discover"] },
);

/**
 * Cached discovery payload (30s). Falls back to an uncached build when the
 * cached path rejects (e.g. an optional rail was empty), so callers still get
 * real data rather than an error.
 */
export async function getHubDiscoverPayload(): Promise<HubDiscoverPayload> {
  try {
    return await cachedPayload();
  } catch (err) {
    if (err instanceof UpstreamUnavailableError && err.message === "popular users unavailable") {
      return buildHubDiscoverPayload();
    }
    throw err;
  }
}

/** SSR helper: never throws, never waits longer than `ms`. */
export async function getHubDiscoverPayloadForSsr(ms = 1_500): Promise<HubDiscoverPayload | null> {
  return withBudget(
    getHubDiscoverPayload().catch(() => null),
    ms,
    null,
  );
}
