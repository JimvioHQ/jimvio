import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  rankProducts,
  resolveMatchedCategoryIds,
  sanitizeSearchTerm,
  scoreCategory,
  sqlSearchTerms,
  type SearchableCategory,
  type SearchableProduct,
} from "@/lib/marketplace/search-engine";

const PHYSICAL_TYPES = ["physical"] as const;
const DIGITAL_TYPES = ["digital", "course", "ebook", "software", "template", "coaching"] as const;

const PRODUCT_SELECT = `
  id, name, slug, price, currency, compare_at_price, images, product_type,
  status, is_flash_deal, discount_label, shipping_from,
  delivery_time, affiliate_commission_rate, sale_count,
  rating, review_count, is_free_shipping, vendor_id, category_id,
  short_description, tags, view_count,
  vendors(id, business_name, verification_status)
`;

function ilikePattern(term: string) {
  return `%${term}%`;
}

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get("q") ?? "";
  const q = sanitizeSearchTerm(rawQ);
  const type = req.nextUrl.searchParams.get("type") === "digital" ? "digital" : "physical";
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 40), 60);

  if (q.length < 1) {
    return NextResponse.json({
      query: q,
      results: [],
      categories: [],
      similar: [],
      recommended: [],
      exactMatch: false,
    });
  }

  try {
    const supabase = await createClient();
    const typeFilter = type === "digital" ? [...DIGITAL_TYPES] : [...PHYSICAL_TYPES];
    const nameTerms = sqlSearchTerms(q, 6);
    const descTerms = sqlSearchTerms(q, 4);

    // Fallback to original query if all expansions were filtered as too short
    const namePatterns = (nameTerms.length > 0 ? nameTerms : [q.toLowerCase()])
      .filter((t) => t.length >= 2)
      .map((t) => `name.ilike.${ilikePattern(t)}`);
    const descPatterns = (descTerms.length > 0 ? descTerms : [q.toLowerCase()])
      .filter((t) => t.length >= 2)
      .map((t) => `short_description.ilike.${ilikePattern(t)}`);

    const [byName, byDesc, categoriesRes, fallbackRes] = await Promise.all([
      namePatterns.length > 0
        ? supabase
            .from("products")
            .select(PRODUCT_SELECT)
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", typeFilter)
            .or(namePatterns.join(","))
            .limit(80)
        : Promise.resolve({ data: [] as SearchableProduct[] }),
      descPatterns.length > 0
        ? supabase
            .from("products")
            .select(PRODUCT_SELECT)
            .eq("status", "active")
            .eq("is_active", true)
            .is("deleted_at", null)
            .in("product_type", typeFilter)
            .or(descPatterns.join(","))
            .limit(40)
        : Promise.resolve({ data: [] as SearchableProduct[] }),
      supabase
        .from("product_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .eq("visible", true)
        .limit(60),
      supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", typeFilter)
        .order("view_count", { ascending: false })
        .limit(24),
    ]);

    const categories = (categoriesRes.data ?? []) as SearchableCategory[];
    const matchedCategoryIds = resolveMatchedCategoryIds(categories, q);

    let byCategory: { data: SearchableProduct[] | null } = { data: [] };
    if (matchedCategoryIds.length > 0) {
      const res = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .eq("is_active", true)
        .is("deleted_at", null)
        .in("product_type", typeFilter)
        .in("category_id", matchedCategoryIds)
        .limit(40);
      byCategory = { data: (res.data ?? []) as SearchableProduct[] };
    }

    const merged = new Map<string, SearchableProduct>();
    for (const row of [...(byName.data ?? []), ...(byDesc.data ?? []), ...(byCategory.data ?? [])]) {
      merged.set(row.id, row as SearchableProduct);
    }
    const categoryById = new Map(categories.map((c) => [c.id, c.name]));
    const vendorById = new Map<string, string>();
    for (const p of merged.values()) {
      const v = (p as { vendors?: { business_name?: string | null } | null }).vendors;
      if (p.vendor_id && v?.business_name) vendorById.set(p.vendor_id, v.business_name);
    }

    // Higher floor after fuzzy fixes — weak accidental hits no longer clear as "exact"
    const ranked = rankProducts([...merged.values()], q, categoryById, vendorById, 20);
    const exactMatch = ranked.length > 0;

    const matchedCategories = categories
      .filter((c) => matchedCategoryIds.includes(c.id))
      .map((c) => ({ ...c, _searchScore: scoreCategory(c, sqlSearchTerms(q, 8)) }))
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, 6);

    if (!exactMatch) {
      const fallbackProducts = (fallbackRes.data ?? []) as SearchableProduct[];
      const rankedFallback = rankProducts(
        fallbackProducts,
        q,
        categoryById,
        vendorById,
        0,
      );
      const similarRanked = rankedFallback.filter((p) => p._searchScore >= 15).slice(0, limit);
      const similarIds = new Set(similarRanked.map((p) => p.id));
      const recommended = fallbackProducts
        .filter((p) => !similarIds.has(p.id))
        .slice(0, 12);

      return NextResponse.json({
        query: q,
        results: [],
        categories: matchedCategories,
        similar: similarRanked,
        recommended,
        exactMatch,
      });
    }

    return NextResponse.json({
      query: q,
      results: ranked.slice(0, limit),
      categories: matchedCategories,
      similar: [],
      recommended: [],
      exactMatch,
    });
  } catch (e) {
    console.error("GET /api/marketplace/search:", e);
    return NextResponse.json({
      query: q,
      results: [],
      categories: [],
      similar: [],
      recommended: [],
      exactMatch: false,
      error: true,
    });
  }
}
