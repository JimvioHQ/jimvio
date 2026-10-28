import type { SupabaseClient } from "@supabase/supabase-js";
import { attachProductVideos, fetchProductVideosMap } from "@/lib/product-videos";
import { MARKETPLACE_PAGE_SIZE } from "@/lib/marketplace/constants";
import {
  paginateSearchResults,
  rankProducts,
  resolveMatchedCategoryIds,
  sanitizeSearchTerm,
  sqlSearchTerms,
  type SearchableCategory,
  type SearchableProduct,
} from "@/lib/marketplace/search-engine";
import type { DbProduct } from "@/lib/utils";
import { marketplaceCustomerUsd } from "@/lib/marketplace/display-price";
import {
  applyDigitalVerification,
  hasTrendingSales,
  isAiCategorySlug,
  isFastShippingDelivery,
  isVerifiedDigitalListing,
  isVerificationColumnError,
} from "@/lib/marketplace/catalog-filters";
import {
  categoryTypeOrFilter,
  MARKETPLACE_NEW_ARRIVAL_MS,
  MARKETPLACE_PRICE_CEILING,
  readMarketplaceFormat,
  readMarketplaceOffer,
  type MarketplaceFormat,
  type MarketplaceOffer,
} from "@/lib/marketplace/experience";

const PHYSICAL_TYPES = ["physical"] as const;
const DIGITAL_TYPES = ["digital", "course", "ebook", "software", "template", "coaching"] as const;

const PRODUCT_SELECT = `
  id, name, slug, price, price_usd, currency, compare_at_price, images, product_type, created_at,
  digital_verification_state,
  status, is_active, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count,
  rating, review_count, is_free_shipping, vendor_id, category_id,
  short_description, description, tags, view_count, sku, source, source_metadata,
  vendors(id, business_name, verification_status)
`;

const CANDIDATE_LIMIT = 80;

export type MarketplaceSearchPayload = {
  query: string;
  type: "physical" | "digital";
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  products: DbProduct[];
};

function ilikePattern(term: string) {
  return `%${term.replace(/[%_,()]/g, "")}%`;
}

function searchableTerms(query: string) {
  const terms = sqlSearchTerms(query, 6).filter((term) => term.length >= 2 && !/[,()]/.test(term));
  return terms.length > 0 ? terms : [sanitizeSearchTerm(query).toLowerCase()].filter((term) => term.length >= 2);
}

function orIlike(column: string, terms: string[]) {
  return terms.map((term) => `${column}.ilike.${ilikePattern(term)}`).join(",");
}

function forScoring(row: SearchableProduct & { description?: string | null }): SearchableProduct {
  const { description, ...rest } = row;
  const longText =
    typeof description === "string"
      ? description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 360)
      : "";
  const shortText = (row.short_description ?? "").replace(/\s+/g, " ").trim();
  return {
    ...rest,
    short_description: [shortText, longText].filter(Boolean).join(" ").slice(0, 520),
  };
}

type SupabaseLike = SupabaseClient<any, any, any>;

async function fetchMatch(
  supabase: SupabaseLike,
  type: "physical" | "digital",
  typeFilter: readonly string[],
  column: string,
  terms: string[],
  limit: number,
) {
  const pattern = orIlike(column, terms);
  if (!pattern) return [] as SearchableProduct[];
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .eq("is_active", true)
    .eq("auto_unpublished", false)
    .is("deleted_at", null)
    .in("product_type", [...typeFilter]);
  query = applyDigitalVerification(query as never, type) as typeof query;
  const { data, error } = await query.or(pattern).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchableProduct[];
}

export type MarketplaceSearchConstraints = {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  offer?: MarketplaceOffer | "";
  format?: MarketplaceFormat | "";
  arrivals?: boolean;
  /** sale_count > 0. Legacy purchased is accepted by the route as this flag. */
  trending?: boolean;
  purchased?: boolean;
  fastShipping?: boolean;
  aiPowered?: boolean;
};

export async function runMarketplaceSearch(
  supabase: SupabaseLike,
  input: {
    query: string;
    type: "physical" | "digital";
    page?: number;
    pageSize?: number;
    constraints?: MarketplaceSearchConstraints;
  },
): Promise<MarketplaceSearchPayload> {
  const query = sanitizeSearchTerm(input.query).replace(/\s+/g, " ").trim();
  const type = input.type === "digital" ? "digital" : "physical";
  const pageSize = input.pageSize ?? MARKETPLACE_PAGE_SIZE;
  const empty: MarketplaceSearchPayload = {
    query,
    type,
    page: 1,
    pageSize,
    total: 0,
    pageCount: 1,
    products: [],
  };
  if (query.length < 1) return empty;

  const typeFilter = type === "digital" ? DIGITAL_TYPES : PHYSICAL_TYPES;
  const terms = searchableTerms(query);

  let byName: SearchableProduct[];
  let byShort: SearchableProduct[];
  let byDescription: SearchableProduct[];
  let categoriesRes: { data: SearchableCategory[] | null; error: { message: string } | null };
  try {
    [byName, byShort, byDescription, categoriesRes] = await Promise.all([
    fetchMatch(supabase, type, typeFilter, "name", terms, CANDIDATE_LIMIT),
    fetchMatch(supabase, type, typeFilter, "short_description", terms, 40),
    fetchMatch(supabase, type, typeFilter, "description", terms, 40),
    supabase
      .from("product_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .eq("visible", true)
      .or(categoryTypeOrFilter(type))
      .limit(80),
    ]);
  } catch (error) {
    if (type === "digital" && isVerificationColumnError(error instanceof Error ? error : { message: String(error) })) {
      return empty;
    }
    throw error;
  }

  const categories = (categoriesRes.data ?? []) as SearchableCategory[];
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  const matchedCategoryIds = resolveMatchedCategoryIds(categories, query);

  let byCategory: SearchableProduct[] = [];
  if (matchedCategoryIds.length > 0) {
    let categoryQuery = supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .eq("auto_unpublished", false)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .in("category_id", matchedCategoryIds.slice(0, 12));
    categoryQuery = applyDigitalVerification(categoryQuery as never, type) as typeof categoryQuery;
    const { data, error } = await categoryQuery.limit(40);
    if (error) {
      if (type === "digital" && isVerificationColumnError(error)) return empty;
      throw new Error(error.message);
    }
    byCategory = (data ?? []) as SearchableProduct[];
  }

  const merged = new Map<string, SearchableProduct>();
  for (const row of [...byName, ...byShort, ...byDescription, ...byCategory]) {
    if (!row?.id || merged.has(row.id)) continue;
    merged.set(row.id, forScoring(row));
  }

  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const vendorById = new Map<string, string>();
  for (const product of merged.values()) {
    const vendor = (product as { vendors?: { business_name?: string | null } | null }).vendors;
    if (product.vendor_id && vendor?.business_name) vendorById.set(product.vendor_id, vendor.business_name);
  }

  const ranked = rankProducts([...merged.values()], query, categoryById, vendorById, 15);
  const constrained = await applySearchConstraints(supabase, type, ranked, input.constraints);
  const page = paginateSearchResults(constrained, input.page ?? 1, pageSize);
  const pageItems = page.items.map((product) => {
    const copy = { ...(product as object) } as DbProduct & { _searchScore?: number; description?: string | null };
    delete copy._searchScore;
    delete copy.description;
    return copy;
  });

  const videoMap = await fetchProductVideosMap(
    supabase,
    pageItems.map((product) => product.id),
  );

  return {
    query,
    type,
    page: page.page,
    pageSize: page.pageSize,
    total: page.total,
    pageCount: page.pageCount,
    products: attachProductVideos(pageItems, videoMap),
  };
}

async function applySearchConstraints<T extends SearchableProduct>(
  supabase: SupabaseLike,
  type: "physical" | "digital",
  products: T[],
  constraints: MarketplaceSearchConstraints | undefined,
): Promise<T[]> {
  if (!constraints) {
    if (type !== "digital") return products;
    return products.filter((product) => {
      if (product.product_type === "physical") return false;
      const state = (product as { digital_verification_state?: string | null }).digital_verification_state;
      return isVerifiedDigitalListing(state);
    });
  }
  const offer = readMarketplaceOffer(constraints.offer, type);
  const format = readMarketplaceFormat(constraints.format, type);
  const minPrice = Number(constraints.minPrice);
  const maxPrice = Number(constraints.maxPrice);
  const categorySlug = constraints.categorySlug?.trim() ?? "";

  let allowedCategories: Set<string> | null = null;
  let aiCategories: Set<string> | null = null;
  if (type === "digital" && constraints?.aiPowered) {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, slug")
      .eq("is_active", true)
      .or(categoryTypeOrFilter(type))
      .ilike("slug", "digital-ai-%")
      .limit(80);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as { id: string; slug: string }[])
      .filter((row) => isAiCategorySlug(row.slug) && row.id)
      .map((row) => row.id);
    if (ids.length === 0) return [];
    aiCategories = new Set(ids);
  }
  if (categorySlug) {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id")
      .eq("slug", categorySlug)
      .eq("is_active", true)
      .or(categoryTypeOrFilter(type))
      .limit(1);
    if (error) throw new Error(error.message);
    const parentId = data?.[0]?.id;
    if (!parentId) return [];
    const { data: children, error: childError } = await supabase
      .from("product_categories")
      .select("id")
      .eq("is_active", true)
      .eq("parent_id", parentId)
      .or(categoryTypeOrFilter(type));
    if (childError) throw new Error(childError.message);
    allowedCategories = new Set([parentId, ...((children ?? []) as { id: string }[]).map((row) => row.id)]);
  }

  const filtered = products.filter((product) => {
    const row = product as T & {
      price?: number | string | null;
      price_usd?: number | string | null;
      currency?: string | null;
      created_at?: string | null;
      is_free_shipping?: boolean | null;
      is_flash_deal?: boolean | null;
    };
    if (allowedCategories && (!product.category_id || !allowedCategories.has(product.category_id))) return false;
    const priceFilterActive =
      (Number.isFinite(minPrice) && minPrice > 0) ||
      (Number.isFinite(maxPrice) && maxPrice > 0 && maxPrice < MARKETPLACE_PRICE_CEILING);
    if (priceFilterActive) {
      const usd = marketplaceCustomerUsd({
        price: row.price,
        price_usd: row.price_usd,
        currency: row.currency,
      });
      if (usd == null) return false;
      if (Number.isFinite(minPrice) && minPrice > 0 && usd < minPrice) return false;
      if (Number.isFinite(maxPrice) && maxPrice > 0 && maxPrice < MARKETPLACE_PRICE_CEILING && usd > maxPrice) {
        return false;
      }
    }
    if (type === "digital") {
      if (product.product_type === "physical") return false;
      const state = (product as { digital_verification_state?: string | null }).digital_verification_state;
      if (!isVerifiedDigitalListing(state)) return false;
    }
    if (aiCategories && (!product.category_id || !aiCategories.has(product.category_id))) return false;
    if (constraints.arrivals) {
      const created = Date.parse(String(row.created_at ?? ""));
      if (!Number.isFinite(created) || Date.now() - created > MARKETPLACE_NEW_ARRIVAL_MS) return false;
    }
    if ((constraints.trending || constraints.purchased) && !hasTrendingSales(product.sale_count)) return false;
    if (constraints.fastShipping && !isFastShippingDelivery((product as { delivery_time?: string | null }).delivery_time)) {
      return false;
    }
    if (offer === "free_shipping" && row.is_free_shipping !== true) return false;
    if (offer === "flash_deal" && row.is_flash_deal !== true) return false;
    if (format && product.product_type !== format) return false;
    return true;
  });
  if (constraints.trending || constraints.purchased) {
    filtered.sort((left, right) => {
      const leftSales = Number(left.sale_count ?? 0);
      const rightSales = Number(right.sale_count ?? 0);
      return (Number.isFinite(rightSales) ? rightSales : 0) - (Number.isFinite(leftSales) ? leftSales : 0);
    });
  }
  return filtered;
}
