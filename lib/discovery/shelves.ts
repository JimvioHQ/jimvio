/**
 * Extended discovery shelves: trending, featured, recommended, following,
 * recently viewed, nearby (future-ready).
 */

import { getDiscoveryShelves as getGrowthShelves } from "@/services/growth/discovery";
import {
  getFollowingRecommendations,
  getRecentlyViewed,
  getRecommendations,
} from "@/lib/discovery/recommendations";
import type { DiscoveryHit, RecommendationShelf } from "@/lib/discovery/types";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type DiscoveryMode =
  | "trending"
  | "featured"
  | "recently_viewed"
  | "recommended"
  | "following"
  | "nearby"
  | "all";

function admin() {
  return createServiceRoleClient() as any;
}

function mapGrowthItem(
  item: { id: string; title: string; subtitle?: string | null; imageUrl?: string | null; href: string },
  entityType: DiscoveryHit["entityType"],
  score: number
): DiscoveryHit {
  return {
    id: item.id,
    entityType,
    title: item.title,
    subtitle: item.subtitle,
    href: item.href,
    imageUrl: item.imageUrl,
    score,
  };
}

async function trendingProducts(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("products")
    .select("id, name, slug, short_description, images, view_count")
    .eq("status", "active")
    .eq("is_active", true)
    .order("view_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "product" as const,
    title: row.name,
    subtitle: row.short_description,
    href: `/marketplace/${row.slug}`,
    imageUrl: Array.isArray(row.images) ? (row.images[0] as string) ?? null : null,
    score: 100 - i,
    meta: { mode: "trending" },
  }));
}

async function featuredCommunities(limit: number): Promise<DiscoveryHit[]> {
  const { data } = await admin()
    .from("communities")
    .select("id, name, slug, tagline, avatar_url, member_count")
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("member_count", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row: any, i: number) => ({
    id: row.id,
    entityType: "community" as const,
    title: row.name,
    subtitle: row.tagline,
    href: `/communities/${row.slug}`,
    imageUrl: row.avatar_url,
    score: 100 - i,
    meta: { mode: "featured" },
  }));
}

/** Nearby is future-ready — returns empty until geo columns exist. */
async function nearbyStub(): Promise<DiscoveryHit[]> {
  return [];
}

export async function getUnifiedDiscoveryShelves(input?: {
  userId?: string | null;
  modes?: DiscoveryMode[];
  limit?: number;
}): Promise<RecommendationShelf[]> {
  const limit = Math.min(Math.max(input?.limit ?? 8, 1), 24);
  const modes =
    input?.modes?.length && !input.modes.includes("all") ?
      input.modes
    : ([
        "trending",
        "featured",
        "recommended",
        "recently_viewed",
        "following",
        "nearby",
      ] as DiscoveryMode[]);

  const shelves: RecommendationShelf[] = [];

  // Baseline growth shelves always available for featured/trending blend
  const growth = await getGrowthShelves().catch(() => null);

  for (const mode of modes) {
    try {
      if (mode === "trending") {
        const items = await trendingProducts(limit);
        if (growth?.lives?.length) {
          items.push(
            ...growth.lives.slice(0, 3).map((l, i) => mapGrowthItem(l, "live", 80 - i))
          );
        }
        shelves.push({
          id: "trending",
          label: "Trending",
          entityType: "mixed",
          items: items.slice(0, limit),
        });
      } else if (mode === "featured") {
        const [communities, growthProducts] = await Promise.all([
          featuredCommunities(limit),
          Promise.resolve(
            (growth?.products ?? []).map((p, i) => mapGrowthItem(p, "product", 90 - i))
          ),
        ]);
        shelves.push({
          id: "featured",
          label: "Featured",
          entityType: "mixed",
          items: [...communities, ...growthProducts].slice(0, limit),
        });
      } else if (mode === "recommended") {
        const reco = await getRecommendations({
          entity: "all",
          limit,
          userId: input?.userId,
        });
        shelves.push(...reco);
      } else if (mode === "recently_viewed" && input?.userId) {
        const items = await getRecentlyViewed(input.userId, limit);
        if (items.length) {
          shelves.push({
            id: "recently_viewed",
            label: "Recently viewed",
            entityType: "mixed",
            items,
          });
        }
      } else if (mode === "following" && input?.userId) {
        const items = await getFollowingRecommendations(input.userId, limit);
        if (items.length) {
          shelves.push({
            id: "following",
            label: "From creators you follow",
            entityType: "product",
            items,
          });
        }
      } else if (mode === "nearby") {
        const items = await nearbyStub();
        shelves.push({
          id: "nearby",
          label: "Nearby",
          entityType: "mixed",
          items,
          // Future-ready empty shelf signals clients that the mode exists.
        });
      }
    } catch (err) {
      console.warn(`[getUnifiedDiscoveryShelves] ${mode} failed:`, err);
    }
  }

  return shelves;
}
