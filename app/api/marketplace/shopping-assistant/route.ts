import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { generateGeminiText } from "@/lib/ai/gemini-fallback";
import {
  parseGeminiProviderFailure,
  shouldContinueGeminiAttempts,
  type GeminiProviderFailure,
} from "@/lib/ai/gemini-model";
import { wrapUntrusted } from "@/lib/ai/information-policy";
import {
  completeText,
  openaiAttemptModels,
  readOpenAIKey,
  shouldRetryProviderError,
} from "@/lib/ai/openai-runtime";
import { qualifiesForGeminiFallback } from "@/lib/ai/provider-policy";
import { rateLimit } from "@/lib/ops/rate-limit";
import { runMarketplaceSearch } from "@/lib/marketplace/run-marketplace-search";
import { getMarketplaceTypeFilter } from "@/lib/marketplace/fetch-page-data";
import {
  emptyCatalogReply,
  firstProductImage,
  groundedCatalogBlock,
  groundedFallbackReply,
  isBroadShoppingQuestion,
  sanitizeShoppingMessage,
  shoppingAssistantSystemPrompt,
  shoppingIntentForMessage,
  shoppingIntentReason,
  type GroundedShoppingProduct,
  type ShoppingIntent,
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
  if (isConfidentialAiRequest(message)) {
    return NextResponse.json({ ok: true, reply: CONFIDENTIAL_AI_REFUSAL, products: [] });
  }

  const type = body.type === "digital" ? "digital" : "physical";
  const intent = shoppingIntentForMessage(message);
  const apiKey = readOpenAIKey();

  let products: GroundedShoppingProduct[] = [];
  try {
    const supabase = await createClient();
    products = await loadShoppingProducts(supabase, type, message, intent);
  } catch (error) {
    console.error("[shopping-assistant] catalog lookup failed:", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  if (products.length === 0) {
    return NextResponse.json({
      ok: true,
      reply: emptyCatalogReply(type, intent),
      products: [],
    });
  }

  if (!apiKey) {
    return NextResponse.json({
      ok: true,
      reply: groundedFallbackReply(type, products),
      products,
    });
  }

  try {
    const attempts = openaiAttemptModels();
    let reply = "";
    let lastFailure: GeminiProviderFailure | null = null;
    let lastError: unknown = null;
    const shoppingInput = `${groundedCatalogBlock(products)}\n\n${wrapUntrusted("Shopper", message, 500)}`;
    for (const modelName of attempts) {
      let attempt = 0;
      while (attempt < 2) {
        attempt += 1;
        try {
          reply = (
            await completeText({
              apiKey,
              model: modelName,
              instructions: shoppingAssistantSystemPrompt(),
              input: shoppingInput,
              temperature: 0.3,
              maxOutputTokens: 220,
              timeoutMs: 20_000,
            })
          ).trim();
          if (reply) break;
          lastFailure = {
            category: "empty_output",
            retryAfterSeconds: null,
            quotaScope: null,
            detail: "empty output",
          };
          attempt = 2;
          break;
        } catch (error) {
          lastError = error;
          lastFailure = parseGeminiProviderFailure(error);
          console.warn("[shopping-assistant] provider failed", {
            model: modelName,
            category: lastFailure.category,
            quotaScope: lastFailure.quotaScope,
            retryAfterSeconds: lastFailure.retryAfterSeconds,
            detail: lastFailure.detail,
          });
          if (attempt === 1 && shouldRetryProviderError(error)) continue;
          break;
        }
      }
      if (reply) break;
      if (lastFailure?.category === "empty_output") break;
      if (lastFailure && !shouldContinueGeminiAttempts(lastFailure.category)) break;
    }

    if (!reply && lastError && qualifiesForGeminiFallback(lastError)) {
      const text = await generateGeminiText({
        instructions: shoppingAssistantSystemPrompt(),
        prompt: shoppingInput,
        temperature: 0.3,
        maxOutputTokens: 220,
        timeoutMs: 20_000,
      });
      if (text?.trim()) {
        return NextResponse.json({ ok: true, reply: text.trim(), products });
      }
    }

    if (!reply) {
      return NextResponse.json({
        ok: true,
        reply: groundedFallbackReply(type, products),
        products,
      });
    }

    return NextResponse.json({
      ok: true,
      reply,
      products,
    });
  } catch (error) {
    const failure = parseGeminiProviderFailure(error);
    console.warn("[shopping-assistant] provider failed", {
      category: failure.category,
      quotaScope: failure.quotaScope,
      detail: failure.detail,
    });
    return NextResponse.json({
      ok: true,
      reply: groundedFallbackReply(type, products),
      products,
    });
  }
}

const SHOPPING_SELECT =
  "id, name, slug, price, currency, images, product_type, sale_count, view_count, affiliate_commission_rate";

function toGrounded(
  rows: Array<Record<string, unknown>>,
  reason: string,
): GroundedShoppingProduct[] {
  return rows.slice(0, 6).map((row) => ({
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    slug: String(row.slug ?? ""),
    price: (row.price as number | string | null) ?? null,
    currency: (row.currency as string | null) ?? null,
    product_type: (row.product_type as string | null) ?? null,
    image: firstProductImage(row.images),
    reason,
  })).filter((product) => product.id && product.slug && product.name);
}

async function loadShoppingProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  type: "physical" | "digital",
  message: string,
  intent: ShoppingIntent | null,
): Promise<GroundedShoppingProduct[]> {
  const typeFilter = [...getMarketplaceTypeFilter(type)];
  if (intent) {
    if (
      (intent === "courses" || intent === "templates" || intent === "software") &&
      type !== "digital"
    ) {
      return [];
    }
    let query = supabase
      .from("products")
      .select(SHOPPING_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null);
    if (intent === "courses") query = query.eq("product_type", "course");
    else if (intent === "templates") query = query.eq("product_type", "template");
    else if (intent === "software") query = query.eq("product_type", "software");
    else query = query.in("product_type", typeFilter);
    if (intent === "high_commission") query = query.not("affiliate_commission_rate", "is", null).gt("affiliate_commission_rate", 0);
    if (intent === "most_sales") query = query.order("sale_count", { ascending: false });
    else if (intent === "high_commission") query = query.order("affiliate_commission_rate", { ascending: false });
    else query = query.order("view_count", { ascending: false });
    const { data, error } = await query.limit(6);
    if (error) throw new Error(error.message);
    return toGrounded((data ?? []) as Array<Record<string, unknown>>, shoppingIntentReason(intent));
  }

  if (isBroadShoppingQuestion(message)) {
    const { data, error } = await supabase
      .from("products")
      .select(SHOPPING_SELECT)
      .eq("status", "active")
      .eq("is_active", true)
      .is("deleted_at", null)
      .in("product_type", typeFilter)
      .order("view_count", { ascending: false })
      .limit(4);
    if (error) throw new Error(error.message);
    return toGrounded(
      (data ?? []) as Array<Record<string, unknown>>,
      "Currently listed in this marketplace",
    );
  }

  const search = await runMarketplaceSearch(supabase, {
    query: message,
    type,
    page: 1,
    pageSize: 6,
  });
  return search.products.slice(0, 6).map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    currency: product.currency,
    product_type: product.product_type,
    image: firstProductImage(product.images),
    reason: shoppingIntentReason(null),
  }));
}
