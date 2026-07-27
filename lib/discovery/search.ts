/**
 * Unified cross-entity discovery search.
 * Public catalogs use service role; private content is membership-scoped.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { discoveryCacheGet, discoveryCacheKey, discoveryCacheSet } from "@/lib/discovery/cache";
import {
  combineScore,
  engagementBoost,
  freshnessBoost,
  textRelevanceScore,
} from "@/lib/discovery/ranking";
import { ilikePattern, sanitizeSearchTerm, typoTolerantTerms } from "@/lib/discovery/sanitize";
import {
  DISCOVERY_ENTITY_TYPES,
  type DiscoveryEntityType,
  type DiscoveryHit,
  type DiscoverySearchInput,
  type DiscoverySearchResult,
} from "@/lib/discovery/types";

function admin() {
  return createServiceRoleClient() as any;
}

function imageUrl(images: unknown): string | null {
  if (Array.isArray(images)) {
    const first = images[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof (first as any).url === "string") {
      return (first as any).url;
    }
  }
  return null;
}

function encodeCursor(score: number, id: string): string {
  return Buffer.from(JSON.stringify({ s: score, id }), "utf8").toString("base64url");
}

function decodeCursor(raw?: string | null): { s: number; id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      s?: number;
      id?: string;
    };
    if (typeof parsed.s === "number" && typeof parsed.id === "string") return { s: parsed.s, id: parsed.id };
  } catch {
    /* ignore */
  }
  return null;
}

async function membershipCommunityIds(userId: string, communityId?: string | null) {
  const supabase = await createClient();
  let q = supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (communityId) q = q.eq("community_id", communityId);
  const { data } = await q;
  return (data ?? []).map((r) => r.community_id as string);
}

async function searchProducts(pattern: string, query: string, limit: number, digitalOnly = false) {
  let q = admin()
    .from("products")
    .select(
      "id, name, slug, short_description, images, product_type, view_count, sale_count, is_featured, created_at, tags"
    )
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .ilike("name", pattern)
    .order("view_count", { ascending: false })
    .limit(limit);
  if (digitalOnly) {
    q = q.in("product_type", ["digital", "course", "ebook", "software", "template", "coaching"]);
  }
  const { data } = await q;
  return (data ?? []).map((row: any) => {
    const relevance = textRelevanceScore(query, row.name, row.short_description, row.tags);
    const score = combineScore({
      relevance,
      engagement: engagementBoost({
        views: row.view_count,
        sales: row.sale_count,
        featured: row.is_featured,
      }),
      freshness: freshnessBoost(row.created_at),
    });
    return {
      id: row.id,
      entityType: (digitalOnly ? "digital" : "product") as DiscoveryEntityType,
      title: row.name,
      subtitle: row.short_description,
      href: `/marketplace/${row.slug}`,
      imageUrl: imageUrl(row.images),
      score,
      meta: { productType: row.product_type },
    } satisfies DiscoveryHit;
  });
}

async function searchCommunities(pattern: string, query: string, limit: number) {
  const { data } = await admin()
    .from("communities")
    .select("id, name, slug, tagline, avatar_url, member_count, is_featured, created_at, visibility")
    .eq("is_active", true)
    .ilike("name", pattern)
    .order("member_count", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .filter((row: any) => {
      const vis = String(row.visibility ?? "public").toLowerCase();
      return vis === "public" || vis === "unlisted" || !row.visibility;
    })
    .map((row: any) => {
      const score = combineScore({
        relevance: textRelevanceScore(query, row.name, row.tagline),
        engagement: engagementBoost({ members: row.member_count, featured: row.is_featured }),
        freshness: freshnessBoost(row.created_at),
      });
      return {
        id: row.id,
        entityType: "community" as const,
        title: row.name,
        subtitle: row.tagline ?? `${row.member_count ?? 0} members`,
        href: `/communities/${row.slug}`,
        imageUrl: row.avatar_url,
        score,
      } satisfies DiscoveryHit;
    });
}

async function searchCreators(pattern: string, query: string, limit: number) {
  const [{ data: influencers }, { data: vendors }, { data: profiles }] = await Promise.all([
    admin()
      .from("influencers")
      .select("id, user_id, display_name, bio, profile_image, total_followers, is_featured")
      .eq("is_active", true)
      .ilike("display_name", pattern)
      .order("total_followers", { ascending: false })
      .limit(limit),
    admin()
      .from("vendors")
      .select("id, user_id, business_name, business_slug, total_sales, is_active")
      .eq("is_active", true)
      .ilike("business_name", pattern)
      .order("total_sales", { ascending: false })
      .limit(limit),
    admin()
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .or(`username.ilike."${pattern.replace(/"/g, '""')}",full_name.ilike."${pattern.replace(/"/g, '""')}"`)
      .limit(limit),
  ]);

  const hits: DiscoveryHit[] = [];
  for (const row of influencers ?? []) {
    hits.push({
      id: row.id,
      entityType: "creator",
      title: row.display_name,
      subtitle: row.bio ?? `${row.total_followers ?? 0} followers`,
      href: `/influencers/u/${row.user_id}`,
      imageUrl: row.profile_image,
      score: combineScore({
        relevance: textRelevanceScore(query, row.display_name, row.bio),
        engagement: engagementBoost({ followers: row.total_followers, featured: row.is_featured }),
      }),
    });
  }
  for (const row of vendors ?? []) {
    hits.push({
      id: `vendor-${row.id}`,
      entityType: "creator",
      title: row.business_name,
      subtitle: "Vendor",
      href: `/vendors/${row.business_slug}`,
      score: combineScore({
        relevance: textRelevanceScore(query, row.business_name),
        engagement: engagementBoost({ sales: row.total_sales }),
      }),
      meta: { kind: "vendor" },
    });
  }
  for (const row of profiles ?? []) {
    const title = row.full_name || row.username || "Creator";
    hits.push({
      id: `profile-${row.id}`,
      entityType: "creator",
      title,
      subtitle: row.username ? `@${row.username}` : null,
      href: `/u/${row.username || row.id}`,
      imageUrl: row.avatar_url,
      score: textRelevanceScore(query, title, row.username),
      meta: { kind: "profile" },
    });
  }
  return hits;
}

async function searchCourses(pattern: string, query: string, limit: number) {
  const { data } = await admin()
    .from("community_courses")
    .select("id, title, description, thumbnail_url, is_published, created_at, room_id, community_id")
    .eq("is_published", true)
    .ilike("title", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: "course" as const,
    title: row.title,
    subtitle: row.description,
    href: row.room_id ? `/communities/rooms/${row.room_id}` : `/dashboard/library`,
    imageUrl: row.thumbnail_url,
    score: combineScore({
      relevance: textRelevanceScore(query, row.title, row.description),
      freshness: freshnessBoost(row.created_at),
    }),
  }));
}

async function searchLessons(pattern: string, query: string, limit: number) {
  const { data } = await admin()
    .from("course_lessons")
    .select("id, title, course_id, created_at, is_free")
    .ilike("title", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: "lesson" as const,
    title: row.title,
    subtitle: row.is_free ? "Free lesson" : "Lesson",
    href: `/dashboard/library`,
    score: combineScore({
      relevance: textRelevanceScore(query, row.title),
      freshness: freshnessBoost(row.created_at),
    }),
    meta: { courseId: row.course_id },
  }));
}

async function searchLive(pattern: string, query: string, limit: number) {
  const { data } = await admin()
    .from("live_sessions")
    .select("id, title, description, status, scheduled_at, created_at, settings, privacy")
    .in("status", ["live", "scheduled"])
    .eq("privacy", "public")
    .ilike("title", pattern)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: "live" as const,
    title: row.title ?? "Live session",
    subtitle: row.status === "live" ? "Live now" : row.description,
    href: `/communities/live/${row.id}`,
    imageUrl:
      typeof row.settings?.thumbnail_url === "string" ? row.settings.thumbnail_url : null,
    score: combineScore({
      relevance: textRelevanceScore(query, row.title ?? "", row.description),
      freshness: freshnessBoost(row.scheduled_at ?? row.created_at),
      engagement: row.status === "live" ? 30 : 0,
    }),
  }));
}

async function searchCampaigns(pattern: string, query: string, limit: number) {
  const [{ data: affiliate }, { data: ugc }] = await Promise.all([
    admin()
      .from("affiliate_campaigns")
      .select("id, name, description, status, created_at")
      .in("status", ["active", "draft", "paused"])
      .ilike("name", pattern)
      .limit(limit),
    admin()
      .from("ugc_campaigns")
      .select("id, title, campaign_type, status, created_at")
      .eq("status", "active")
      .ilike("title", pattern)
      .limit(limit),
  ]);

  const hits: DiscoveryHit[] = [];
  for (const row of affiliate ?? []) {
    hits.push({
      id: row.id,
      entityType: "campaign",
      title: row.name,
      subtitle: `Affiliate · ${row.status}`,
      href: "/dashboard/affiliates",
      score: combineScore({
        relevance: textRelevanceScore(query, row.name, row.description),
        freshness: freshnessBoost(row.created_at),
      }),
      meta: { kind: "affiliate" },
    });
  }
  for (const row of ugc ?? []) {
    hits.push({
      id: `ugc-${row.id}`,
      entityType: "campaign",
      title: row.title,
      subtitle: `UGC · ${row.campaign_type ?? "campaign"}`,
      href: `/ugc/campaigns/${row.id}`,
      score: combineScore({
        relevance: textRelevanceScore(query, row.title),
        freshness: freshnessBoost(row.created_at),
      }),
      meta: { kind: "ugc" },
    });
  }
  return hits;
}

async function searchSpaces(
  pattern: string,
  query: string,
  limit: number,
  memberCommunityIds: string[]
) {
  if (memberCommunityIds.length === 0) {
    // Public / featured spaces only
    const { data } = await admin()
      .from("spaces")
      .select("id, name, description, community_id, slug, is_featured, created_at")
      .eq("is_featured", true)
      .ilike("name", pattern)
      .limit(limit);
    return (data ?? []).map((row: any) => ({
      id: row.id,
      entityType: "space" as const,
      title: row.name,
      subtitle: row.description,
      href: `/communities/spaces/${row.id}`,
      score: combineScore({
        relevance: textRelevanceScore(query, row.name, row.description),
        engagement: engagementBoost({ featured: true }),
        freshness: freshnessBoost(row.created_at),
      }),
    }));
  }

  const { data } = await admin()
    .from("spaces")
    .select("id, name, description, community_id, slug, is_featured, created_at")
    .in("community_id", memberCommunityIds)
    .ilike("name", pattern)
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: "space" as const,
    title: row.name,
    subtitle: row.description,
    href: `/communities/spaces/${row.id}`,
    score: combineScore({
      relevance: textRelevanceScore(query, row.name, row.description),
      engagement: engagementBoost({ featured: row.is_featured }),
      freshness: freshnessBoost(row.created_at),
    }),
  }));
}

async function searchPosts(
  pattern: string,
  query: string,
  limit: number,
  memberCommunityIds: string[]
) {
  if (memberCommunityIds.length === 0) return [];
  const { data } = await admin()
    .from("community_posts")
    .select("id, title, body, community_id, created_at, communities(slug, name)")
    .in("community_id", memberCommunityIds)
    .or(
      `title.ilike."${pattern.replace(/"/g, '""')}",body.ilike."${pattern.replace(/"/g, '""')}"`
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => {
    const slug = row.communities?.slug;
    return {
      id: row.id,
      entityType: "post" as const,
      title: row.title || "Post",
      subtitle: row.body?.slice(0, 120) ?? row.communities?.name,
      href: slug ? `/communities/${slug}/feed?post=${row.id}` : `/dashboard`,
      score: combineScore({
        relevance: textRelevanceScore(query, row.title || "", row.body),
        freshness: freshnessBoost(row.created_at),
      }),
    } satisfies DiscoveryHit;
  });
}

async function searchMessages(
  pattern: string,
  query: string,
  limit: number,
  userId: string
) {
  const supabase = await createClient();
  // Rooms the user can access via membership
  const { data: memberships } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(100);
  const communityIds = (memberships ?? []).map((m) => m.community_id);
  if (communityIds.length === 0) return [];

  const { data: rooms } = await admin()
    .from("rooms")
    .select("id, community_id")
    .in("community_id", communityIds)
    .limit(200);
  const roomIds = (rooms ?? []).map((r: any) => r.id as string);
  if (roomIds.length === 0) return [];

  const { data } = await admin()
    .from("community_messages")
    .select("id, body, room_id, created_at")
    .in("room_id", roomIds.slice(0, 80))
    .ilike("body", pattern)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    entityType: "message" as const,
    title: "Message",
    subtitle: String(row.body ?? "").slice(0, 140),
    href: `/dashboard/messages`,
    score: combineScore({
      relevance: textRelevanceScore(query, String(row.body ?? "")),
      freshness: freshnessBoost(row.created_at),
    }),
    meta: { roomId: row.room_id },
  }));
}

/** Organizations — future-ready stub (no org table yet). */
async function searchOrganizations(_pattern: string, _query: string, _limit: number) {
  return [] as DiscoveryHit[];
}

export async function globalSearch(
  input: DiscoverySearchInput
): Promise<DiscoverySearchResult> {
  const started = Date.now();
  const query = sanitizeSearchTerm(input.q);
  if (query.length < 1) {
    return { items: [], nextCursor: null, hasMore: false, query: "", tookMs: 0 };
  }

  const limit = Math.min(Math.max(input.limit ?? 24, 1), 60);
  const types =
    input.types?.length ?
      input.types
    : (DISCOVERY_ENTITY_TYPES.filter((t) => t !== "organization") as DiscoveryEntityType[]);

  const cacheKey = discoveryCacheKey({
    q: query.toLowerCase(),
    types,
    limit,
    cursor: input.cursor ?? null,
    userId: input.userId ?? null,
    communityId: input.communityId ?? null,
    sort: input.sort ?? "relevance",
  });
  const cached = discoveryCacheGet<DiscoverySearchResult>(cacheKey);
  if (cached) return { ...cached, tookMs: Date.now() - started };

  const pattern = ilikePattern(query);
  // Warm typo terms for potential second-pass (used when primary sparse)
  void typoTolerantTerms(query);

  const memberIds =
    input.userId ?
      await membershipCommunityIds(input.userId, input.communityId)
    : [];

  const per = Math.max(4, Math.ceil(limit / Math.max(3, Math.min(types.length, 6))));
  const tasks: Array<Promise<DiscoveryHit[]>> = [];

  if (types.includes("product")) tasks.push(searchProducts(pattern, query, per));
  if (types.includes("digital")) tasks.push(searchProducts(pattern, query, per, true));
  if (types.includes("community")) tasks.push(searchCommunities(pattern, query, per));
  if (types.includes("creator")) tasks.push(searchCreators(pattern, query, per));
  if (types.includes("course")) tasks.push(searchCourses(pattern, query, per));
  if (types.includes("lesson")) tasks.push(searchLessons(pattern, query, per));
  if (types.includes("live")) tasks.push(searchLive(pattern, query, per));
  if (types.includes("campaign")) tasks.push(searchCampaigns(pattern, query, per));
  if (types.includes("space")) tasks.push(searchSpaces(pattern, query, per, memberIds));
  if (types.includes("post")) tasks.push(searchPosts(pattern, query, per, memberIds));
  if (types.includes("message") && input.userId) {
    tasks.push(searchMessages(pattern, query, per, input.userId));
  }
  if (types.includes("organization")) tasks.push(searchOrganizations(pattern, query, per));

  const settled = await Promise.allSettled(tasks);
  let items: DiscoveryHit[] = [];
  for (const s of settled) {
    if (s.status === "fulfilled") items.push(...s.value);
  }

  // Dedup by entityType:id
  const seen = new Set<string>();
  items = items.filter((item) => {
    const key = `${item.entityType}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if ((input.sort ?? "relevance") === "newest") {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else if (input.sort === "popular") {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  } else {
    items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  const cursor = decodeCursor(input.cursor);
  if (cursor) {
    items = items.filter(
      (item) =>
        item.score < cursor.s || (item.score === cursor.s && item.id > cursor.id)
    );
  }

  const page = items.slice(0, limit);
  const hasMore = items.length > limit;
  const nextCursor =
    hasMore && page.length ?
      encodeCursor(page[page.length - 1].score, page[page.length - 1].id)
    : null;

  const result: DiscoverySearchResult = {
    items: page,
    nextCursor,
    hasMore,
    query,
    tookMs: Date.now() - started,
  };
  discoveryCacheSet(cacheKey, result, types.includes("live") ? 5_000 : 45_000);
  return result;
}
