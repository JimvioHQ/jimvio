import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: reviews }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, short_description, description, rating, review_count")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("rating, body, title")
      .eq("product_id", id)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reviewBits = (reviews ?? [])
    .map((r) => `★${r.rating}: ${(r.title ?? "")} ${(r.body ?? "").slice(0, 120)}`)
    .join("\n");

  const softFallback = () => {
    const rating = product.rating ? `${Number(product.rating).toFixed(1)}★` : "Unrated";
    const count = product.review_count ?? 0;
    const desc = (product.short_description || product.description || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);
    return `${product.name} — ${rating} from ${count} reviews. ${desc || "Shoppers highlight quality and value."}`;
  };

  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ summary: softFallback(), fallback: true });
    }

    const client = new OpenAI({ apiKey });
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Summarize this marketplace product for shoppers in 2-3 short sentences. Neutral, helpful, no hype. Mention rating themes if reviews exist.",
        },
        {
          role: "user",
          content: `Product: ${product.name}\nDescription: ${(product.short_description || product.description || "").slice(0, 800)}\nRating: ${product.rating} (${product.review_count} reviews)\nRecent reviews:\n${reviewBits || "None"}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 180,
    });

    const summary = res.choices[0]?.message?.content?.trim() || softFallback();
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json({
      summary: softFallback(),
      fallback: true,
      warning: e instanceof Error ? e.message : "AI unavailable",
    });
  }
}
