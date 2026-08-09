import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { PHYSICAL_CATEGORY_CATALOG } from "@/lib/marketplace/category-catalog";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { getImage, isRenderableUrl } from "@/lib/utils";

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

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  price_usd?: number | null;
  currency: string | null;
  images: unknown;
  rating: number | null;
  review_count: number | null;
  view_count?: number | null;
  sale_count?: number | null;
  sold_count?: number | null;
  created_at?: string | null;
  category_id?: string | null;
  tags?: string[] | null;
  product_type?: string | null;
  vendors?: { verification_status?: string | null } | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  product_count: number | null;
};

const PRODUCT_LIST_SELECT =
  "id, name, slug, price, price_usd, currency, images, rating, review_count, view_count, sale_count, sold_count, created_at, category_id, tags, product_type, vendors(verification_status)";

const MIN_COLLECTION_PRODUCTS = 2;
const HOME_COLLECTION_LIMIT = 8;
const DETAIL_PRODUCT_LIMIT = 48;
const CATALOG_POOL_LIMIT = 96;

function db(supabase: SupabaseClient): Untyped {
  return supabase as unknown as Untyped;
}

function productCover(images: unknown): string | null {
  const raw = getImage(images);
  if (!raw || raw === "/placeholder.png" || !isRenderableUrl(raw)) return null;
  return safeMediaUrl(raw, 480) ?? null;
}

function normalizeImages(images: unknown): string[] | null {
  const cover = productCover(images);
  if (!cover) return null;
  return [cover];
}

function mapProduct(p: ProductRow) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: Number(p.price ?? p.price_usd ?? 0),
    currency: p.currency ?? null,
    images: normalizeImages(p.images),
    rating: p.rating ?? null,
    review_count: p.review_count ?? null,
  };
}

function priceOf(p: ProductRow): number {
  return Number(p.price_usd ?? p.price ?? 0);
}

function matchesKeywords(haystack: string, keywords: string[]): boolean {
  return keywords.some((kw) => haystack.includes(kw.toLowerCase()));
}

function productHaystack(p: ProductRow, categoryName?: string): string {
  const tags = Array.isArray(p.tags) ? p.tags.join(" ") : "";
  return `${p.name ?? ""} ${tags} ${categoryName ?? ""} ${p.product_type ?? ""}`.toLowerCase();
}

async function fetchActiveProductPool(
  supabase: SupabaseClient,
  limit = CATALOG_POOL_LIMIT,
): Promise<ProductRow[]> {
  const { data, error } = await db(supabase)
    .from("products")
    .select(PRODUCT_LIST_SELECT)
    .eq("status", "active")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("view_count", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return data as ProductRow[];
}

async function fetchTopCategories(
  supabase: SupabaseClient,
): Promise<CategoryRow[]> {
  const { data } = await db(supabase)
    .from("product_categories")
    .select("id, name, slug, product_count")
    .eq("is_active", true)
    .eq("visible", true)
    .is("parent_id", null)
    .order("product_count", { ascending: false })
    .limit(24);

  return (data ?? []) as CategoryRow[];
}

type BuiltCollection = MarketplaceCollection & { products: ProductRow[] };

function buildCatalogCollections(
  products: ProductRow[],
  categories: CategoryRow[],
): BuiltCollection[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const drafted: Array<
    Omit<MarketplaceCollection, "sort_order" | "cover_image_url" | "preview_images" | "product_count"> & {
      products: ProductRow[];
      priority: number;
    }
  > = [];

  const draft = (
    partial: Omit<MarketplaceCollection, "sort_order" | "cover_image_url" | "preview_images" | "product_count"> & {
      products: ProductRow[];
      priority: number;
    },
  ) => {
    drafted.push(partial);
  };

  // Discovery layers first (priority 0–4), then category collections (priority 10+).
  const trending = [...products].sort(
    (a, b) =>
      Number(b.view_count ?? 0) + Number(b.sale_count ?? 0) + Number(b.sold_count ?? 0) -
      (Number(a.view_count ?? 0) + Number(a.sale_count ?? 0) + Number(a.sold_count ?? 0)),
  );
  draft({
    id: "discovery-trending-now",
    slug: "trending-now",
    title: "Trending Now",
    description: "What shoppers are viewing and buying.",
    badge: "Hot",
    priority: 0,
    products: trending.slice(0, 36),
  });

  const under50 = products.filter((p) => {
    const price = priceOf(p);
    return price > 0 && price <= 50;
  });
  draft({
    id: "discovery-under-50",
    slug: "under-50",
    title: "Under $50",
    description: "High-value picks that stay affordable.",
    badge: "Value",
    priority: 1,
    products: under50.slice(0, 36),
  });

  const newArrivals = [...products]
    .filter((p) => p.created_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  draft({
    id: "discovery-new-arrivals",
    slug: "new-arrivals",
    title: "New Arrivals",
    description: "Fresh listings just added to the marketplace.",
    badge: "New",
    priority: 2,
    products: newArrivals.slice(0, 36),
  });

  const creator = products.filter((p) =>
    matchesKeywords(productHaystack(p), [
      "creator",
      "camera",
      "microphone",
      "streaming",
      "tripod",
      "lighting",
      "podcast",
      "ring light",
    ]),
  );
  draft({
    id: "discovery-creator-essentials",
    slug: "creator-essentials",
    title: "Creator Essentials",
    description: "Gear and tools creators actually use.",
    badge: "Curated",
    priority: 3,
    products: creator.slice(0, 36),
  });

  const verified = products.filter((p) => {
    const vendor = p.vendors;
    const status = Array.isArray(vendor)
      ? vendor[0]?.verification_status
      : vendor?.verification_status;
    return status === "verified";
  });
  draft({
    id: "discovery-verified-sellers",
    slug: "verified-sellers",
    title: "From Verified Sellers",
    description: "Products from Jimvio-verified vendors.",
    badge: "Verified",
    priority: 4,
    products: verified.slice(0, 36),
  });

  PHYSICAL_CATEGORY_CATALOG.forEach((curated, index) => {
    const matchedCategory = categories.find(
      (c) =>
        c.slug === curated.slug ||
        matchesKeywords(`${c.name} ${c.slug}`, curated.matchKeywords),
    );

    const matched = products.filter((p) => {
      const cat = p.category_id ? categoryById.get(p.category_id) : undefined;
      if (matchedCategory && p.category_id === matchedCategory.id) return true;
      return matchesKeywords(productHaystack(p, cat?.name), curated.matchKeywords);
    });

    draft({
      id: `cat-${curated.slug}`,
      slug: curated.slug,
      title: curated.name,
      description: `Shop ${curated.name.toLowerCase()} from the Jimvio marketplace.`,
      badge: null,
      priority: 10 + index,
      products: matched,
    });
  });

  const out: BuiltCollection[] = [];
  let sort = 1;
  for (const partial of drafted.sort((a, b) => a.priority - b.priority)) {
    const withCovers = partial.products.filter((p) => productCover(p.images));
    if (withCovers.length < MIN_COLLECTION_PRODUCTS) continue;
    const preview = withCovers
      .map((p) => productCover(p.images))
      .filter((u): u is string => Boolean(u))
      .slice(0, 3);
    out.push({
      id: partial.id,
      slug: partial.slug,
      title: partial.title,
      description: partial.description,
      badge: partial.badge,
      sort_order: sort++,
      product_count: withCovers.length,
      cover_image_url: preview[0] ?? null,
      preview_images: preview,
      products: withCovers,
    });
  }

  return out;
}

function toPublicCollection(c: BuiltCollection): MarketplaceCollection {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    cover_image_url: c.cover_image_url,
    badge: c.badge,
    sort_order: c.sort_order,
    product_count: c.product_count,
    preview_images: c.preview_images,
  };
}

/** Prefer DB-curated collections when they already have linked product imagery. */
async function fetchDbFeaturedCollections(
  supabase: SupabaseClient,
  limit: number,
): Promise<MarketplaceCollection[] | null> {
  try {
    const { data, error } = await db(supabase)
      .from("marketplace_collections")
      .select("id, slug, title, description, cover_image_url, badge, sort_order")
      .eq("is_active", true)
      .eq("is_featured", true)
      .order("sort_order", { ascending: true })
      .limit(limit);

    if (error || !data?.length) return null;

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
      const imgs = (row.products as { images?: unknown } | null)?.images;
      const first = productCover(imgs);
      if (!first) continue;
      const list = byCollection.get(cid) ?? [];
      if (list.length < 3) {
        list.push(first);
        byCollection.set(cid, list);
      }
    }

    const enriched = collections.map((c) => {
      const preview = byCollection.get(c.id) ?? [];
      const cover =
        (c.cover_image_url && isRenderableUrl(c.cover_image_url)
          ? safeMediaUrl(c.cover_image_url, 480)
          : null) ?? preview[0] ?? null;
      return {
        ...c,
        cover_image_url: cover,
        product_count: counts.get(c.id) ?? 0,
        preview_images: preview,
      };
    });

    // Only use DB rows when they actually have covers — otherwise fall through to catalog.
    if (enriched.some((c) => c.cover_image_url && (c.product_count ?? 0) > 0)) {
      return enriched.filter((c) => c.cover_image_url);
    }
    return null;
  } catch {
    return null;
  }
}

/** Featured collections for marketplace home — catalog-backed, image-first. */
export async function fetchFeaturedCollections(
  supabase: SupabaseClient,
  limit = HOME_COLLECTION_LIMIT,
): Promise<MarketplaceCollection[]> {
  const dbCollections = await fetchDbFeaturedCollections(supabase, limit);
  if (dbCollections?.length) {
    return dbCollections.slice(0, limit);
  }

  try {
    const [products, categories] = await Promise.all([
      fetchActiveProductPool(supabase),
      fetchTopCategories(supabase),
    ]);
    if (!products.length) return [];

    return buildCatalogCollections(products, categories)
      .map(toPublicCollection)
      .filter((c) => Boolean(c.cover_image_url))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchCollectionBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<MarketplaceCollectionDetail | null> {
  // 1) Prefer explicit DB collection + linked products when curated.
  try {
    const { data: collection, error } = await db(supabase)
      .from("marketplace_collections")
      .select("id, slug, title, description, cover_image_url, badge, sort_order")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();

    if (!error && collection) {
      const { data: links } = await db(supabase)
        .from("marketplace_collection_products")
        .select(
          "sort_order, products(id, name, slug, price, currency, images, rating, review_count, status, is_active, deleted_at)",
        )
        .eq("collection_id", collection.id)
        .order("sort_order", { ascending: true })
        .limit(DETAIL_PRODUCT_LIMIT);

      const products = ((links ?? []) as Array<{ products: Record<string, unknown> | null }>)
        .map((row) => row.products)
        .filter((p): p is Record<string, unknown> => Boolean(p))
        .filter(
          (p) =>
            p.status === "active" && p.is_active !== false && !p.deleted_at,
        )
        .map((p) => ({
          id: p.id as string,
          name: p.name as string,
          slug: p.slug as string,
          price: Number(p.price ?? 0),
          currency: (p.currency as string | null) ?? null,
          images: normalizeImages(p.images),
          rating: (p.rating as number | null) ?? null,
          review_count: (p.review_count as number | null) ?? null,
        }))
        .filter((p) => p.images?.length);

      if (products.length > 0) {
        const cover =
          (collection.cover_image_url && isRenderableUrl(collection.cover_image_url)
            ? safeMediaUrl(collection.cover_image_url, 640)
            : null) ?? products[0]?.images?.[0] ?? null;

        return {
          ...(collection as MarketplaceCollection),
          cover_image_url: cover,
          product_count: products.length,
          preview_images: products
            .map((p) => p.images?.[0])
            .filter((u): u is string => Boolean(u))
            .slice(0, 3),
          products,
        };
      }
    }
  } catch {
    /* fall through to catalog */
  }

  // 2) Catalog-derived collection (categories + discovery slugs).
  try {
    const [pool, categories] = await Promise.all([
      fetchActiveProductPool(supabase),
      fetchTopCategories(supabase),
    ]);
    const built = buildCatalogCollections(pool, categories).find((c) => c.slug === slug);
    if (!built) return null;

    const products = built.products.slice(0, DETAIL_PRODUCT_LIMIT).map(mapProduct);
    return {
      ...toPublicCollection(built),
      products,
    };
  } catch {
    return null;
  }
}

/** Cached featured list — shared by marketplace index (admin, cookie-free). */
export function getCachedFeaturedCollections(limit = HOME_COLLECTION_LIMIT) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return fetchFeaturedCollections(supabase, limit);
    },
    ["marketplace-featured-collections-v1", String(limit)],
    { revalidate: 60 },
  )();
}

/** Cached collection detail — speeds up card → page navigation. */
export function getCachedCollectionBySlug(slug: string) {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient();
      return fetchCollectionBySlug(supabase, slug);
    },
    ["marketplace-collection-by-slug-v1", slug],
    { revalidate: 60 },
  )();
}
