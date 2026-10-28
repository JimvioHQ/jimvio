import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CONFIDENTIAL_AI_REFUSAL, isConfidentialAiRequest } from "@/lib/ai/ai-guard";
import { parseGeminiProviderFailure } from "@/lib/ai/gemini-model";
import { wrapUntrusted } from "@/lib/ai/information-policy";
import { completeText, openaiAttemptModels, readOpenAIKey } from "@/lib/ai/openai-runtime";
import { rateLimit } from "@/lib/ops/rate-limit";
import { marketplaceCustomerUsd } from "@/lib/marketplace/display-price";
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

const ASSISTANT_CACHE_TTL_MS = 60_000;
const ASSISTANT_CACHE_MAX = 32;
const MODEL_TIMEOUT_MS = 8_000;

type CachedAssistant = {
  at: number;
  reply: string;
  products: GroundedShoppingProduct[];
};

const assistantCache = new Map<string, CachedAssistant>();

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anon"
  );
}

function cacheKey(type: "physical" | "digital", message: string): string {
  return `${type}:${message.toLowerCase()}`;
}

function readAssistantCache(key: string): CachedAssistant | null {
  const hit = assistantCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > ASSISTANT_CACHE_TTL_MS) {
    assistantCache.delete(key);
    return null;
  }
  return hit;
}

function rememberAssistant(key: string, reply: string, products: GroundedShoppingProduct[]) {
  assistantCache.set(key, { at: Date.now(), reply, products: products.slice(0, 6) });
  if (assistantCache.size <= ASSISTANT_CACHE_MAX) return;
  const oldest = assistantCache.keys().next().value;
  if (oldest) assistantCache.delete(oldest);
}

function assistantJson(
  body: { ok: boolean; reply?: string; products?: GroundedShoppingProduct[]; error?: string },
  timing: Record<string, number>,
  status = 200,
) {
  const serverTiming = Object.entries(timing)
    .map(([name, dur]) => `${name};dur=${Math.max(0, Math.round(dur))}`)
    .join(", ");
  return NextResponse.json(body, {
    status,
    headers: serverTiming ? { "Server-Timing": serverTiming } : undefined,
  });
}

export async function POST(req: NextRequest) {
  const started = Date.now();
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
  const key = cacheKey(type, message);
  const cached = readAssistantCache(key);
  if (cached) {
    return assistantJson(
      { ok: true, reply: cached.reply, products: cached.products },
      { cache: Date.now() - started },
    );
  }

  const apiKey = readOpenAIKey();
  let products: GroundedShoppingProduct[] = [];
  const catalogStarted = Date.now();
  try {
    const supabase = await createClient();
    products = await loadShoppingProducts(supabase, type, message, intent);
  } catch (error) {
    console.error("[shopping-assistant] catalog lookup failed:", error);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
  const catalogMs = Date.now() - catalogStarted;

  if (products.length === 0) {
    const reply = emptyCatalogReply(type, intent);
    if (intent) rememberAssistant(key, reply, []);
    return assistantJson({ ok: true, reply, products: [] }, { catalog: catalogMs, model: 0 });
  }

  // Chip intents are exact catalog sorts. The model can only rephrase the same rows.
  if (intent || !apiKey) {
    const reply = groundedFallbackReply(type, products);
    rememberAssistant(key, reply, products);
    return assistantJson(
      { ok: true, reply, products },
      { catalog: catalogMs, model: 0 },
    );
  }

  const modelStarted = Date.now();
  let reply = "";
  try {
    const model = openaiAttemptModels()[0];
    if (model) {
      reply = (
        await completeText({
          apiKey,
          model,
          instructions: shoppingAssistantSystemPrompt(),
          input: `${groundedCatalogBlock(products)}\n\n${wrapUntrusted("Shopper", message, 500)}`,
          temperature: 0.3,
          maxOutputTokens: 220,
          timeoutMs: MODEL_TIMEOUT_MS,
        })
      ).trim();
    }
  } catch (error) {
    const failure = parseGeminiProviderFailure(error);
    console.warn("[shopping-assistant] provider failed", {
      category: failure.category,
      quotaScope: failure.quotaScope,
      detail: failure.detail,
    });
  }
  const modelMs = Date.now() - modelStarted;

  if (!reply) reply = groundedFallbackReply(type, products);
  return assistantJson({ ok: true, reply, products }, { catalog: catalogMs, model: modelMs });
}

const SHOPPING_SELECT =
  "id, name, slug, price, price_usd, currency, images, product_type, sale_count, view_count, affiliate_commission_rate";

function toGrounded(
  rows: Array<Record<string, unknown>>,
  reason: string,
): GroundedShoppingProduct[] {
  return rows.slice(0, 6).map((row) => {
    const currency = (row.currency as string | null) ?? null;
    const price = (row.price as number | string | null) ?? null;
    const storedUsd = marketplaceCustomerUsd({
      price,
      price_usd: row.price_usd as number | string | null,
      currency,
    });
    return {
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      slug: String(row.slug ?? ""),
      price: storedUsd ?? price,
      price_usd: storedUsd,
      currency: storedUsd != null ? "USD" : currency,
      product_type: (row.product_type as string | null) ?? null,
      image: firstProductImage(row.images),
      reason,
    };
  }).filter((product) => product.id && product.slug && product.name);
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
  return toGrounded(
    search.products as unknown as Array<Record<string, unknown>>,
    shoppingIntentReason(null),
  );
}
