import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import {
  GEMINI_API_KEY_ENV,
  classifyProviderError,
  geminiAttemptOrder,
  isUsableApiKey,
  redactProviderMessage,
  resolveGeminiModel,
} from "@/lib/ai/gemini-model";
import { listAccessibleGeminiModels } from "@/lib/ai/gemini-catalog";
import { rateLimit } from "@/lib/ops/rate-limit";
import { runMarketplaceSearch } from "@/lib/marketplace/run-marketplace-search";
import {
  groundedCatalogBlock,
  isBroadShoppingQuestion,
  sanitizeShoppingMessage,
  shoppingAssistantSystemPrompt,
  type GroundedShoppingProduct,
} from "@/lib/marketplace/shopping-assistant";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(`shopping-assistant:${clientIp(req)}`, 12, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limit" },
      { status: 429 },
    );
  }

  let body: { message?: string; type?: string } = {};
  try {
    body = (await req.json()) as { message?: string; type?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const message = sanitizeShoppingMessage(String(body.message ?? ""));
  if (message.length < 1) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }

  const type = body.type === "digital" ? "digital" : "physical";
  const apiKey = process.env[GEMINI_API_KEY_ENV];
  if (!isUsableApiKey(apiKey)) {
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  let products: GroundedShoppingProduct[] = [];
  try {
    if (!isBroadShoppingQuestion(message)) {
    const supabase = await createClient();
    const search = await runMarketplaceSearch(supabase, {
      query: message,
      type,
      page: 1,
      pageSize: 6,
    });
    products = search.products.slice(0, 6).map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      currency: product.currency,
      product_type: product.product_type,
    }));
    }
  } catch (error) {
    console.error("[shopping-assistant] catalog lookup failed:", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  try {
    const catalog = await listAccessibleGeminiModels(apiKey!);
    if (catalog.category === "rate_limit") {
      return NextResponse.json({ ok: false, error: "rate_limit" }, { status: 429 });
    }
    const attempts = geminiAttemptOrder(catalog.models, resolveGeminiModel().model);
    if (!attempts.length) {
      return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
    }

    const genAI = new GoogleGenerativeAI(apiKey!);
    let reply = "";
    let lastCategory: string | null = null;
    for (const modelName of attempts) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: shoppingAssistantSystemPrompt(),
          generationConfig: { maxOutputTokens: 280, temperature: 0.3 },
        });
        const result = await model.generateContent(
          `${groundedCatalogBlock(products)}\n\nShopper: ${message}`,
        );
        reply = result.response.text().trim();
        if (reply) break;
        lastCategory = "empty_output";
      } catch (error) {
        lastCategory = classifyProviderError(error);
        console.warn("[shopping-assistant] provider failed", {
          model: modelName,
          category: lastCategory,
          detail: redactProviderMessage(error),
        });
      }
    }

    if (!reply) {
      const status = lastCategory === "rate_limit" ? 429 : 503;
      return NextResponse.json(
        { ok: false, error: lastCategory === "rate_limit" ? "rate_limit" : "unavailable" },
        { status },
      );
    }

    return NextResponse.json({
      ok: true,
      reply,
      products,
    });
  } catch (error) {
    const category = classifyProviderError(error);
    console.warn("[shopping-assistant] provider failed", {
      category,
      detail: redactProviderMessage(error),
    });
    const status = category === "rate_limit" ? 429 : 503;
    return NextResponse.json({ ok: false, error: category === "rate_limit" ? "rate_limit" : "unavailable" }, { status });
  }
}
