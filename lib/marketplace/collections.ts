import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplaceCollection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  badge: string | null;
  sort_order: number;
  product_count?: number;
  preview_images?: string[];
};

export type MarketplaceCollectionDetail = MarketplaceCollection & {
  products: Array<{
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string | null;
    images: string[] | null;
    rating: number | null;
    review_count: number | null;
  }>;
};

type Untyped = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

function db(supabase: SupabaseClient): Untyped {
  return supabase as unknown as Untyped;
}

/** Featured collections for marketplace home. Falls back to empty if migration not applied. */
export async function fetchFeaturedCollections(
  supabase: SupabaseClient,
  limit = 6
): Promise<MarketplaceCollection[]> {
  try {
    const { data, error } = await db(supabase)
      .from("marketplace_collections")
      .select("id, slug, title, description, cover_image_url, badge, sort_order")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error || !data?.length) return buildFallbackCollections();

    const collections = data as MarketplaceCollection[];
    const ids = collections.map((c) => c.id);

    const { data: links } = await db(supabase)
      .from("marketplace_collection_products")
      .select("collection_id, product_id, sort_order, products(id, images)")
      .in("collection_id", ids)
      .order("sort_order", { ascending: true })
      .limit(ids.length * 8);

    const byCollection = new Map<string, string[]>();
    const counts = new Map<string, number>();
    for (const row of links ?? []) {
      const cid = row.collection_id as string;
      counts.set(cid, (counts.get(cid) ?? 0) + 1);
      const imgs = (row.products as { images?: string[] | null } | null)?.images;
      const first = Array.isArray(imgs) ? imgs.find(Boolean) : null;
      if (!first) continue;
      const list = byCollection.get(cid) ?? [];
      if (list.length < 3) {
        list.push(first);
        byCollection.set(cid, list);
      }
    }

    return collections.map((c) => ({
      ...c,
      product_count: counts.get(c.id) ?? 0,
      preview_images: byCollection.get(c.id) ?? [],
    }));
  } catch {
    return buildFallbackCollections();
  }
}

export async function fetchCollectionBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<MarketplaceCollectionDetail | null> {
  try {
    const { data: collection, error } = await db(supabase)
      .from("marketplace_collections")
      .select("id, slug, title, description, cover_image_url, badge, sort_order")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !collection) {
      const fallback = buildFallbackCollections().find((c) => c.slug === slug);
      if (!fallback) return null;
      return { ...fallback, products: [] };
    }

    const { data: links } = await db(supabase)
      .from("marketplace_collection_products")
      .select(
        "sort_order, products(id, name, slug, price, currency, images, rating, review_count, status, is_active, deleted_at)"
      )
      .eq("collection_id", collection.id)
      .order("sort_order", { ascending: true })
      .limit(48);

    const products = (links ?? [])
      .map((row: { products: Record<string, unknown> | null }) => row.products)
      .filter((p): p is Record<string, unknown> => Boolean(p))
      .filter((p) => p.status === "active" && p.is_active !== false && !p.deleted_at)
      .map((p) => ({
        id: p.id as string,
        name: p.name as string,
        slug: p.slug as string,
        price: Number(p.price ?? 0),
        currency: (p.currency as string | null) ?? null,
        images: (p.images as string[] | null) ?? null,
        rating: (p.rating as number | null) ?? null,
        review_count: (p.review_count as number | null) ?? null,
      }));

    return {
      ...(collection as MarketplaceCollection),
      product_count: products.length,
      products,
    };
  } catch {
    return null;
  }
}

/** Soft fallbacks so home still shows Collections before migration is applied. */
function buildFallbackCollections(): MarketplaceCollection[] {
  return [
    {
      id: "fallback-creator",
      slug: "creator-essentials",
      title: "Creator Essentials",
      description: "Gear and tools creators actually use.",
      cover_image_url: null,
      badge: "Curated",
      sort_order: 1,
      product_count: 0,
      preview_images: [],
    },
    {
      id: "fallback-value",
      slug: "under-50",
      title: "Under $50",
      description: "High-value picks that stay affordable.",
      cover_image_url: null,
      badge: "Value",
      sort_order: 2,
      product_count: 0,
      preview_images: [],
    },
    {
      id: "fallback-verified",
      slug: "verified-sellers",
      title: "From Verified Sellers",
      description: "Products from Jimvio-verified vendors.",
      cover_image_url: null,
      badge: "Verified",
      sort_order: 3,
      product_count: 0,
      preview_images: [],
    },
    {
      id: "fallback-trending",
      slug: "trending-now",
      title: "Trending Now",
      description: "What shoppers are viewing and buying.",
      cover_image_url: null,
      badge: "Hot",
      sort_order: 4,
      product_count: 0,
      preview_images: [],
    },
  ];
}
