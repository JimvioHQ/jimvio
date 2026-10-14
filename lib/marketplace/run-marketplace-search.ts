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

const PHYSICAL_TYPES = ["physical"] as const;
const DIGITAL_TYPES = ["digital", "course", "ebook", "software", "template", "coaching"] as const;

const PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
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
  typeFilter: readonly string[],
  column: string,
  terms: string[],
  limit: number,
) {
  const pattern = orIlike(column, terms);
  if (!pattern) return [] as SearchableProduct[];
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .eq("is_active", true)
    .eq("auto_unpublished", false)
    .is("deleted_at", null)
    .in("product_type", [...typeFilter])
    .or(pattern)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as SearchableProduct[];
}

export async function runMarketplaceSearch(
  supabase: SupabaseLike,
  input: { query: string; type: "physical" | "digital"; page?: number; pageSize?: number },
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

  const [byName, byShort, byDescription, categoriesRes] = await Promise.all([
    fetchMatch(supabase, typeFilter, "name", terms, CANDIDATE_LIMIT),
    fetchMatch(supabase, typeFilter, "short_description", terms, 40),
    fetchMatch(supabase, typeFilter, "description", terms, 40),
    supabase
      .from("product_categories")
      .select("id, name, slug")
      .eq("is_active", true)
      .eq("visible", true)
      .limit(80),
  ]);

  const categories = (categoriesRes.data ?? []) as SearchableCategory[];
  if (categoriesRes.error) throw new Error(categoriesRes.error.message);
  const matchedCategoryIds = resolveMatchedCategoryIds(categories, query);

  let byCategory: SearchableProduct[] = [];
  if (matchedCategoryIds.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .eq("auto_unpublished", false)
      .is("deleted_at", null)
      .in("product_type", [...typeFilter])
      .in("category_id", matchedCategoryIds.slice(0, 12))
      .limit(40);
    if (error) throw new Error(error.message);
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
  const page = paginateSearchResults(ranked, input.page ?? 1, pageSize);
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
