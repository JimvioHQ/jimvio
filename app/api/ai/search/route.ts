import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSearchIntent, generateTextEmbedding } from "@/lib/ai/ai-search-service";
import { rateLimit } from "@/lib/ops/rate-limit";
import {
  expandSearchTerms,
  scoreProduct,
  sanitizeSearchTerm,
  type SearchableProduct,
} from "@/lib/marketplace/search-engine";

export const dynamic = "force-dynamic";

/**
 * Marketplace AI Search — NL intent + keyword hybrid.
 * Falls back gracefully when embeddings / match_products RPC are unavailable.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as { query?: string; type?: string };
    const query = sanitizeSearchTerm(body.query ?? "");
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "anon";
    const limited = rateLimit(`ai-search:${ip}`, 30, 60_000);
    if (!limited.allowed) {
      return NextResponse.json({ error: "Too many searches. Wait a moment and retry." }, { status: 429 });
    }

    let intent: { category?: string | null; max_price?: number | null; search_term?: string } = {
      search_term: query,
    };

    try {
      intent = await parseSearchIntent(query);
    } catch {
      // Soft: continue with raw query
    }

    const searchTerm = sanitizeSearchTerm(intent.search_term || query) || query;
    const supabase = await createClient();

    // Try semantic RPC when available
    try {
      const embedding = await generateTextEmbedding(searchTerm);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: products, error } = await (supabase as any).rpc("match_products", {
        query_embedding: embedding,
        match_threshold: 0.45,
        match_count: 24,
        max_price_filter: intent.max_price || 999999,
        category_filter: intent.category || null,
      });
      if (!error && Array.isArray(products) && products.length > 0) {
        return NextResponse.json({
          intent,
          mode: "semantic",
          products,
        });
      }
    } catch {
      // Fall through to keyword hybrid
    }

    const terms = expandSearchTerms(searchTerm);
    let q = supabase
      .from("products")
      .select(
        "id, name, slug, price, currency, compare_at_price, images, product_type, rating, review_count, view_count, sale_count, short_description, tags, category_id, vendor_id, vendors(business_name, verification_status)"
      )
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .limit(120);

    if (body.type === "digital") {
      q = q.in("product_type", ["digital", "course", "ebook", "software", "template", "coaching"]);
    } else if (body.type === "physical") {
      q = q.eq("product_type", "physical");
    }

    if (intent.max_price && intent.max_price > 0) {
      q = q.lte("price", intent.max_price);
    }

    const { data: rows, error } = await q;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const scored = ((rows ?? []) as SearchableProduct[])
      .map((p) => ({ ...p, _searchScore: scoreProduct(p, terms) }))
      .filter((p) => p._searchScore > 0)
      .sort((a, b) => b._searchScore - a._searchScore)
      .slice(0, 24);

    return NextResponse.json({
      intent,
      mode: "hybrid",
      products: scored,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI search failed";
    console.error("AI Search Error:", message);
    return NextResponse.json({ error: "Failed", message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const type = req.nextUrl.searchParams.get("type") ?? undefined;
  const fake = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q, type }),
  });
  return POST(fake as NextRequest);
}
