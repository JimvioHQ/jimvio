import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSuggestions,
  expandSearchTerms,
  sanitizeSearchTerm,
  type SearchableCategory,
  type SearchableProduct,
} from "@/lib/marketplace/search-engine";
import { PHYSICAL_CATEGORY_CATALOG, DIGITAL_CATEGORY_CATALOG } from "@/lib/marketplace/category-catalog";

const PHYSICAL_TYPES = ["physical"] as const;
const DIGITAL_TYPES = ["digital", "course", "ebook", "software", "template", "coaching"] as const;

function ilikePattern(term: string) {
  return `%${term}%`;
}

export async function GET(req: NextRequest) {
  const q = sanitizeSearchTerm(req.nextUrl.searchParams.get("q") ?? "");
  const type = req.nextUrl.searchParams.get("type") === "digital" ? "digital" : "physical";

  if (q.length < 1) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const supabase = await createClient();
    const terms = expandSearchTerms(q);
    const typeFilter = type === "digital" ? [...DIGITAL_TYPES] : [...PHYSICAL_TYPES];
    const patterns = terms.slice(0, 5).map((t) => `name.ilike.${ilikePattern(t)}`);

    const { data: products } = await supabase
      .from("products")
      .select("id, name, slug, short_description, tags, category_id, vendor_id, product_type, view_count, sale_count")
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", typeFilter)
      .or(patterns.join(","))
      .order("view_count", { ascending: false })
      .limit(40);

    const catalog = type === "digital" ? DIGITAL_CATEGORY_CATALOG : PHYSICAL_CATEGORY_CATALOG;
    const categories: SearchableCategory[] = catalog.map((c) => ({
      id: c.slug,
      name: c.name,
      slug: c.slug,
    }));

    const suggestions = buildSuggestions(
      q,
      (products ?? []) as SearchableProduct[],
      categories,
      type,
      8,
    );

    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("GET /api/marketplace/suggestions:", e);
    return NextResponse.json({ suggestions: [] });
  }
}
