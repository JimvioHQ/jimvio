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
import {
  groundedCatalogBlock,
  isBroadShoppingQuestion,
  sanitizeShoppingMessage,
  shoppingAssistantSystemPrompt,
  type GroundedShoppingProduct,
} from "@/lib/marketplace/shopping-assistant";

export const dynamic = "force-dynamic";

type ProviderBlock = {
  until: number;
  failure: GeminiProviderFailure;
};

let providerBlock: ProviderBlock | null = null;

function blockRemainingSeconds(): number {
  if (!providerBlock) return 0;
  const left = providerBlock.until - Date.now();
  if (left <= 0) {
    providerBlock = null;
    return 0;
  }
  return Math.ceil(left / 1000);
}

function rememberProviderBlock(failure: GeminiProviderFailure): number | null {
  if (failure.category !== "rate_limit") return failure.retryAfterSeconds;
  const wait = failure.quotaScope === "daily"
    ? 15 * 60
    : Math.min(90, Math.max(failure.retryAfterSeconds ?? 20, 8));
  providerBlock = { until: Date.now() + wait * 1000, failure };
  return failure.quotaScope === "daily" ? failure.retryAfterSeconds : wait;
}

function limitResponse(failure: GeminiProviderFailure, retryAfterSeconds: number | null) {
  const status = failure.category === "rate_limit" ? 429 : 503;
  const headers: Record<string, string> = {};
  if (retryAfterSeconds && retryAfterSeconds > 0) headers["Retry-After"] = String(retryAfterSeconds);
  return NextResponse.json(
    {
      ok: false,
      error: failure.category === "rate_limit" ? "rate_limit" : "unavailable",
      quotaScope: failure.quotaScope,
      retryAfterSeconds,
    },
    { status, headers },
  );
}

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
  const apiKey = readOpenAIKey();
  if (!apiKey) {
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

  const remaining = blockRemainingSeconds();
  if (remaining > 0 && providerBlock) {
    return limitResponse(providerBlock.failure, providerBlock.failure.quotaScope === "daily" ? null : remaining);
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
      const failure = lastFailure ?? {
        category: "provider" as const,
        retryAfterSeconds: null,
        quotaScope: null,
        detail: "no model response",
      };
      return limitResponse(failure, rememberProviderBlock(failure));
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
    return limitResponse(failure, rememberProviderBlock(failure));
  }
}
