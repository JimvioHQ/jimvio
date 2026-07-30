/**
 * Lightweight recommendation shelves — ranking heuristics, not expensive models.
 */

import { getRecommendedCommunitiesForYou } from "@/lib/discovery/community-affinity";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createClient } from "@/lib/supabase/server";
import { discoveryCacheGet, discoveryCacheKey, discoveryCacheSet } from "@/lib/discovery/cache";
import type { DiscoveryHit, DiscoveryEntityType, RecommendationShelf } from "@/lib/discovery/types";

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

async function recommendProducts(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("products")
    .select("id, name, slug, short_description, images, sale_count, view_count, is_featured")
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .order("sale_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "product" as const,
    title: row.name,
    subtitle: row.short_description,
    href: `/marketplace/${row.slug}`,
    imageUrl: imageUrl(row.images),
    score: 100 - i,
  }));
}

async function recommendCourses(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("community_courses")
    .select("id, title, description, thumbnail_url, room_id")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "course" as const,
    title: row.title,
    subtitle: row.description,
    href: row.room_id ? `/communities/rooms/${row.room_id}` : "/dashboard/library",
    imageUrl: row.thumbnail_url,
    score: 100 - i,
  }));
}

async function recommendCommunities(
  limit: number,
  userId?: string | null
): Promise<DiscoveryHit[]> {
  if (userId) {
    return getRecommendedCommunitiesForYou(userId, limit);
  }

  const { data } = await admin()
    .from("communities")
    .select("id, name, slug, tagline, avatar_url, member_count, is_featured")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("member_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "community" as const,
    title: row.name,
    subtitle: row.tagline ?? `${row.member_count ?? 0} members`,
    href: `/communities/${row.slug}`,
    imageUrl: row.avatar_url,
    score: 100 - i,
  }));
}

async function recommendLive(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("live_sessions")
    .select("id, title, description, status, settings, privacy")
    .in("status", ["live", "scheduled"])
    .eq("privacy", "public")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "live" as const,
    title: row.title ?? "Live session",
    subtitle: row.status === "live" ? "Live now" : row.description,
    href: `/communities/live/${row.id}`,
    imageUrl:
      typeof row.settings?.thumbnail_url === "string" ? row.settings.thumbnail_url : null,
    score: 100 - i + (row.status === "live" ? 20 : 0),
  }));
}

async function recommendCreators(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("influencers")
    .select("id, user_id, display_name, bio, profile_image, total_followers, is_featured")
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("total_followers", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "creator" as const,
    title: row.display_name,
    subtitle: row.bio ?? `${row.total_followers ?? 0} followers`,
    href: `/influencers/u/${row.user_id}`,
    imageUrl: row.profile_image,
    score: 100 - i,
  }));
}

const ENTITY_FN: Record<
  "product" | "course" | "community" | "live" | "creator",
  (limit: number, userId?: string | null) => Promise<DiscoveryHit[]>
> = {
  product: recommendProducts,
  course: recommendCourses,
  community: recommendCommunities,
  live: recommendLive,
  creator: recommendCreators,
};

function recommendationShelfLabel(
  entity: "product" | "course" | "community" | "live" | "creator",
  userId?: string | null
): string {
  if (entity === "community" && userId) return "Recommended for You";
  if (entity === "live") return "Recommended lives";
  return `Recommended ${entity}s`;
}

export async function getRecommendations(input: {
  entity?: DiscoveryEntityType | "all";
  limit?: number;
  userId?: string | null;
}): Promise<RecommendationShelf[]> {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 24);
  const cacheKey = discoveryCacheKey({
    kind: "reco",
    entity: input.entity ?? "all",
    limit,
    userId: input.userId ?? null,
  });
  const cached = discoveryCacheGet<RecommendationShelf[]>(cacheKey);
  if (cached) return cached;

  const RECO_ENTITIES = ["product", "course", "community", "live", "creator"] as const;
  type RecoEntity = (typeof RECO_ENTITIES)[number];
  const wanted: RecoEntity[] =
    !input.entity || input.entity === "all"
      ? [...RECO_ENTITIES]
      : RECO_ENTITIES.includes(input.entity as RecoEntity)
        ? [input.entity as RecoEntity]
        : [];

  const shelves: RecommendationShelf[] = [];
  for (const entity of wanted) {
    const fn = ENTITY_FN[entity];
    if (!fn) continue;
    try {
      const items = await fn(limit, input.userId ?? null);
      shelves.push({
        id: `recommended-${entity}`,
        label: recommendationShelfLabel(entity, input.userId ?? null),
        entityType: entity,
        items,
      });
    } catch (err) {
      console.warn(`[getRecommendations] ${entity} failed:`, err);
    }
  }

  discoveryCacheSet(
    cacheKey,
    shelves,
    input.entity === "live" ? 5_000 : 90_000
  );
  return shelves;
}

export async function getRecentlyViewed(userId: string, limit = 12): Promise<DiscoveryHit[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("discovery_views")
    .select("entity_type, entity_id, title, href, metadata, viewed_at")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row: any, i: number) => ({
    id: row.entity_id,
    entityType: row.entity_type,
    title: row.title ?? row.entity_type,
    subtitle: null,
    href: row.href ?? "/dashboard",
    imageUrl: row.metadata?.imageUrl ?? null,
    score: 100 - i,
    meta: row.metadata ?? {},
  }));
}

export async function recordDiscoveryView(input: {
  userId: string;
  entityType: DiscoveryEntityType;
  entityId: string;
  title?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  await (supabase as any).from("discovery_views").upsert(
    {
      user_id: input.userId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      title: input.title ?? null,
      href: input.href ?? null,
      metadata: input.metadata ?? {},
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "user_id,entity_type,entity_id" }
  );
}

export async function recordSearchHistory(
  userId: string,
  query: string,
  resultCount: number
): Promise<void> {
  if (query.trim().length < 2) return;
  const supabase = await createClient();
  await (supabase as any).from("search_history").insert({
    user_id: userId,
    query: query.trim().slice(0, 120),
    result_count: resultCount,
  });
}

export async function getFollowingRecommendations(
  userId: string,
  limit = 8
): Promise<DiscoveryHit[]> {
  const supabase = await createClient();
  // Vendor follows if table exists; soft-fail otherwise
  try {
    const { data: follows } = await (supabase as any)
      .from("vendor_followers")
      .select("vendor_id")
      .eq("user_id", userId)
      .limit(40);
    const vendorIds = (follows ?? []).map((f: any) => f.vendor_id).filter(Boolean);
    if (vendorIds.length === 0) return [];
    const { data } = await admin()
      .from("products")
      .select("id, name, slug, short_description, images, vendor_id")
      .in("vendor_id", vendorIds)
      .eq("status", "active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((row: any, i: number) => ({
      id: row.id,
      entityType: "product" as const,
      title: row.name,
      subtitle: row.short_description,
      href: `/marketplace/${row.slug}`,
      imageUrl: imageUrl(row.images),
      score: 100 - i,
      meta: { source: "following" },
    }));
  } catch {
    return [];
  }
}
