import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_PRODUCTS = 8;
const MAX_VENDORS = 6;
const MAX_CATEGORIES = 6;

/** Avoid ILIKE metacharacters in user input */
function sanitizeIlikeTerm(s: string) {
  return s.replace(/[%_\\]/g, "").trim().slice(0, 80);
}

export async function GET(req: NextRequest) {
  const term = sanitizeIlikeTerm(req.nextUrl.searchParams.get("q") ?? "");
  if (term.length < 2) {
    return NextResponse.json({ products: [], vendors: [], categories: [] });
  }

  try {
    const supabase = await createClient();

    const [productsRes, vendorsRes, categoriesRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug")
        .eq("status", "active")
        .eq("is_active", true)
        .ilike("name", `%${term}%`)
        .order("view_count", { ascending: false })
        .limit(MAX_PRODUCTS),
      supabase
        .from("vendors")
        .select("id, business_name, business_slug")
        .eq("is_active", true)
        .ilike("business_name", `%${term}%`)
        .order("total_sales", { ascending: false })
        .limit(MAX_VENDORS),
      supabase
        .from("product_categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .ilike("name", `%${term}%`)
        .order("sort_order", { ascending: true })
        .limit(MAX_CATEGORIES),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (vendorsRes.error) throw vendorsRes.error;
    if (categoriesRes.error) throw categoriesRes.error;

    return NextResponse.json({
      products: productsRes.data ?? [],
      vendors: vendorsRes.data ?? [],
      categories: categoriesRes.data ?? [],
    });
  } catch (e) {
    console.error("GET /api/search/suggestions:", e);
    return NextResponse.json({ products: [], vendors: [], categories: [] });
  }
}
