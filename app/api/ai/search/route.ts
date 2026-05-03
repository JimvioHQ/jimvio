import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateTextEmbedding, parseSearchIntent } from "@/lib/ai/ai-search-service";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * AI-First Sourcing Search: Natural Language → Structured Filters → Semantic Match
 * Example POST: { "query": "cheap wireless earbuds under $50" }
 */
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    // 1. Parse natural language into structured filters using LLM
    const intent = await parseSearchIntent(query);
    const { category, max_price, search_term } = intent;

    // 2. Generate a 768-dimension embedding for the search term
    const embedding = await generateTextEmbedding(search_term);

    // 3. Call the Supabase RPC 'match_products' for hybrid semantic search
    const { data: products, error } = await supabase.rpc("match_products", {
      query_embedding: embedding,
      match_threshold: 0.5, // Tweak this for sensitivity
      match_count: 5,
      max_price_filter: max_price || 999999,
      category_filter: category || null
    });

    if (error) throw error;

    return NextResponse.json({
      intent,
      products: products || []
    });
  } catch (error: any) {
    console.error("AI Search Error:", error.message);
    return NextResponse.json({ error: "Failed", message: error.message }, { status: 500 });
  }
}
