import { NextRequest, NextResponse } from "next/server";
import { completeVisionText, openaiAttemptModels, readOpenAIKey } from "@/lib/ai/openai-runtime";
import { rateLimit } from "@/lib/ops/rate-limit";
import { runMarketplaceSearch } from "@/lib/marketplace/run-marketplace-search";
import { createClient } from "@/lib/supabase/server";
import { parseVisualDataUrl, parseVisualQuery } from "@/lib/marketplace/visual-search";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`visual-search:${clientIp(req)}`, 8, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
  }

  let body: { image?: string; type?: string } = {};
  try {
    body = (await req.json()) as { image?: string; type?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (!parseVisualDataUrl(image)) {
    return NextResponse.json(
      { ok: false, error: "Use a JPEG, PNG, or WebP photo under 4 MB." },
      { status: 400 },
    );
  }

  const type = body.type === "digital" ? "digital" : "physical";
  const apiKey = readOpenAIKey();
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  let query = "";
  try {
    const text = await completeVisionText({
      apiKey,
      model: openaiAttemptModels()[0] ?? "gpt-4o-mini",
      instructions:
        "You name products for a marketplace search. Reply with JSON only: {\"query\":\"2 to 6 words\"}. Use an empty query when the image is not a product. Do not invent a brand that is not readable.",
      prompt: "What product is in this photo? Reply with the JSON object only.",
      imageDataUrl: image,
      maxOutputTokens: 60,
      timeoutMs: 20_000,
    });
    query = parseVisualQuery(text);
  } catch (error) {
    console.warn("[visual-search] provider failed", error instanceof Error ? error.name : "error");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  if (!query) {
    return NextResponse.json({
      ok: true,
      query: "",
      products: [],
      reply: "That photo doesn’t look like a product we can search for. Try another image or type a product name.",
    });
  }

  try {
    const supabase = await createClient();
    const search = await runMarketplaceSearch(supabase, {
      query,
      type,
      page: 1,
      pageSize: 12,
    });
    return NextResponse.json({
      ok: true,
      query,
      products: search.products,
      reply:
        search.products.length > 0
          ? `Showing ${type} matches for “${query}”.`
          : `No ${type} products matched “${query}”.`,
    });
  } catch (error) {
    console.error("[visual-search] catalog lookup failed:", error instanceof Error ? error.message : "error");
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
