import { GoogleGenerativeAI } from "@google/generative-ai";
import type { GeminiCatalogResult } from "@/lib/ai/gemini-catalog";
import {
  GEMINI_API_KEY_ENV,
  GEMINI_FALLBACK_MODEL,
  GEMINI_MODEL_ENV,
  geminiAttemptOrder,
  isUsableApiKey,
  redactProviderMessage,
  resolveGeminiModel,
} from "@/lib/ai/gemini-model";
import { affiliatePlainText } from "@/lib/affiliate/rich-content";

export const AFFILIATE_AI_PROVIDER = "gemini" as const;

const QUOTA_MESSAGE = "Jimvio AI promotion is temporarily unavailable. Try again in a little while.";
const RATE_MESSAGE = "Jimvio AI is busy right now. Wait a moment and retry.";
const NETWORK_MESSAGE = "Jimvio AI couldn't finish these promotion assets just now.";
const AUTH_MESSAGE = "Jimvio AI promotion is temporarily unavailable.";
const UNCONFIGURED_MESSAGE = "Jimvio AI promotion is temporarily unavailable.";
const INVALID_MESSAGE = "Jimvio AI returned an incomplete promotion kit. Retry generation.";
const PROVIDER_MESSAGE = "Jimvio AI couldn't finish these promotion assets just now.";

const REQUIRED_FIELDS = [
  "tiktokCaption",
  "instagramCaption",
  "youtubeTitle",
  "facebookPost",
  "threadsPost",
  "xPost",
  "emailCopy",
  "blogIntro",
  "seoTitle",
] as const;

export type AffiliatePromotionInput = {
  productName: string;
  category: string;
  price: number;
  currency?: string;
  commissionRate: number;
  features?: string[];
  description?: string;
  trackingUrl?: string | null;
};

export type AffiliatePromotionKit = {
  tiktokCaption: string;
  instagramCaption: string;
  youtubeTitle: string;
  facebookPost: string;
  threadsPost: string;
  xPost: string;
  emailCopy: string;
  blogIntro: string;
  seoTitle: string;
  keywords: string[];
  hashtags: string[];
  hooks: string[];
  scripts: string[];
};

export type AffiliateAiCode =
  | "unconfigured"
  | "authentication"
  | "quota"
  | "rate_limit"
  | "network"
  | "invalid_output"
  | "retired_model"
  | "provider";

export class AffiliateAiError extends Error {
  code: AffiliateAiCode;
  status: number;

  constructor(message: string, code: AffiliateAiCode, status: number) {
    super(message);
    this.name = "AffiliateAiError";
    this.code = code;
    this.status = status;
  }
}

export function affiliateGeminiConfig(env: Record<string, string | undefined> = process.env): {
  configured: boolean;
  model: string;
  keyEnv: typeof GEMINI_API_KEY_ENV;
} {
  const resolved = resolveGeminiModel(env[GEMINI_MODEL_ENV]);
  return {
    configured: isUsableApiKey(env[GEMINI_API_KEY_ENV]),
    model: resolved.model,
    keyEnv: GEMINI_API_KEY_ENV,
  };
}

export function selectGenerationBackend(type: string): "gemini" | "openai" {
  return type === "affiliate_promotion" ? "gemini" : "openai";
}

export function classifyAffiliateProviderFailure(error: unknown): AffiliateAiError {
  if (error instanceof AffiliateAiError) return error;
  const message = redactProviderMessage(error);
  if (/quota|exceeded your current quota|insufficient_quota|billing account|credit balance/i.test(message)) {
    return new AffiliateAiError(QUOTA_MESSAGE, "quota", 429);
  }
  if (/rate limit|too many requests/i.test(message)) {
    return new AffiliateAiError(RATE_MESSAGE, "rate_limit", 429);
  }
  if (/resource exhausted|resource_exhausted/i.test(message)) {
    return new AffiliateAiError(QUOTA_MESSAGE, "quota", 429);
  }
  if (/api key|unauthenticated|permission denied|\b401\b|\b403\b/i.test(message)) {
    return new AffiliateAiError(AUTH_MESSAGE, "authentication", 503);
  }
  if (/not found|no longer available|retired|\b404\b/i.test(message)) {
    return new AffiliateAiError(PROVIDER_MESSAGE, "retired_model", 404);
  }
  if (/timeout|timed out|network|fetch failed|econnreset|\b503\b|\b502\b|unavailable/i.test(message)) {
    return new AffiliateAiError(NETWORK_MESSAGE, "network", 503);
  }
  return new AffiliateAiError(PROVIDER_MESSAGE, "provider", 502);
}

function clip(value: string, max = 800): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max).trim() : text;
}

function asStringList(value: unknown, maxItems = 8): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? clip(item, 240) : ""))
    .filter(Boolean)
    .slice(0, maxItems);
}

export function parseAffiliatePromotionKit(raw: string): AffiliatePromotionKit {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new AffiliateAiError(INVALID_MESSAGE, "invalid_output", 502);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new AffiliateAiError(INVALID_MESSAGE, "invalid_output", 502);
  }
  const record = parsed as Record<string, unknown>;
  const strings = {} as Record<(typeof REQUIRED_FIELDS)[number], string>;
  for (const key of REQUIRED_FIELDS) {
    const value = record[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new AffiliateAiError(INVALID_MESSAGE, "invalid_output", 502);
    }
    strings[key] = clip(value);
  }
  return {
    ...strings,
    keywords: asStringList(record.keywords),
    hashtags: asStringList(record.hashtags),
    hooks: asStringList(record.hooks),
    scripts: asStringList(record.scripts, 4),
  };
}

function promotionPrompt(params: AffiliatePromotionInput): string {
  const description = affiliatePlainText(params.description ?? "").slice(0, 700);
  const features = (params.features ?? [])
    .map((feature) => affiliatePlainText(feature))
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  return `You are Jimvio AI, an affiliate marketing copywriter.

Product: ${clip(params.productName, 180)}
Category: ${clip(params.category, 80)}
Price: ${params.currency || "USD"} ${Number.isFinite(params.price) ? params.price : 0}
Commission: ${Number.isFinite(params.commissionRate) ? params.commissionRate : 0}%
Tracked link: ${params.trackingUrl?.startsWith("https://") ? params.trackingUrl : "the creator's existing Jimvio tracked link"}
Features: ${features || "n/a"}
Description: ${description || "n/a"}

Write platform-ready affiliate promotion assets for TikTok, Instagram, YouTube, Facebook, Threads, and X. Keep the copy specific to this product. Tell the creator to use the tracked link above and not to invent a different URL. Do not invent specifications, discounts, guarantees, prices, or commission rates.

Return ONLY JSON with these exact keys:
{
  "tiktokCaption": "...",
  "instagramCaption": "...",
  "youtubeTitle": "...",
  "facebookPost": "...",
  "threadsPost": "...",
  "xPost": "...",
  "emailCopy": "...",
  "blogIntro": "...",
  "keywords": ["...", "..."],
  "seoTitle": "...",
  "hashtags": ["#...", "#..."],
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "scripts": ["15s script", "30s script"]
}`;
}

function backoffMs(attempt: number): number {
  return Math.min(1500, 250 * 2 ** Math.max(0, attempt - 1));
}

function attemptsFor(code: AffiliateAiCode): number {
  if (code === "rate_limit") return 2;
  if (code === "network" || code === "provider") return 3;
  return 1;
}

async function completeWithGemini(model: string, prompt: string, apiKey: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const generative = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1800,
      responseMimeType: "application/json",
    },
  });
  const result = await generative.generateContent(prompt);
  const text = result.response.text();
  if (!text.trim()) throw new AffiliateAiError(INVALID_MESSAGE, "invalid_output", 502);
  return text;
}

export type AffiliateGeminiDeps = {
  env?: Record<string, string | undefined>;
  complete?: (request: { model: string; prompt: string }) => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
  /** Same catalog the Jimvio AI workspace uses. Tests omit this and keep the static model list. */
  listModels?: () => Promise<GeminiCatalogResult>;
};

function failureBody(error: AffiliateAiError, providerReady: boolean) {
  return {
    status: error.status,
    body: {
      error: error.message,
      code: error.code,
      provider: AFFILIATE_AI_PROVIDER,
      providerReady,
      workspaceFallback: true as const,
    },
  };
}

function catalogFailure(listed: GeminiCatalogResult): AffiliateAiError {
  const detail = listed.detail ?? "";
  if (listed.category === "authentication") return new AffiliateAiError(AUTH_MESSAGE, "authentication", 503);
  if (listed.category === "rate_limit" && /quota|billing|credit/i.test(detail)) {
    return new AffiliateAiError(QUOTA_MESSAGE, "quota", 429);
  }
  if (listed.category === "rate_limit") return new AffiliateAiError(RATE_MESSAGE, "rate_limit", 429);
  if (listed.category === "retired_model") return new AffiliateAiError(PROVIDER_MESSAGE, "retired_model", 404);
  if (listed.category === "timeout") return new AffiliateAiError(NETWORK_MESSAGE, "network", 503);
  return new AffiliateAiError(PROVIDER_MESSAGE, "provider", 502);
}

export async function createAffiliatePromotionResponse(
  params: AffiliatePromotionInput,
  deps: AffiliateGeminiDeps = {},
): Promise<{
  status: number;
  body: {
    success?: boolean;
    data?: AffiliatePromotionKit;
    error?: string;
    code?: string;
    provider: typeof AFFILIATE_AI_PROVIDER;
    providerReady?: boolean;
    workspaceFallback?: boolean;
  };
}> {
  const env = deps.env ?? process.env;
  const config = affiliateGeminiConfig(env);
  if (!config.configured) {
    return failureBody(new AffiliateAiError(UNCONFIGURED_MESSAGE, "unconfigured", 503), false);
  }

  const key = env[GEMINI_API_KEY_ENV]?.trim() ?? "";
  let models = [config.model];
  if (!models.includes(GEMINI_FALLBACK_MODEL)) models.push(GEMINI_FALLBACK_MODEL);
  if (deps.listModels) {
    try {
      const listed = await deps.listModels();
      if (listed.category === "authentication" || listed.category === "rate_limit") {
        const failure = catalogFailure(listed);
        console.error("[affiliate-ai]", { code: failure.code, status: failure.status });
        return failureBody(failure, failure.code !== "authentication");
      }
      if (!listed.category && listed.models.length > 0) {
        const ordered = geminiAttemptOrder(listed.models, config.model);
        if (ordered.length) models = ordered;
      }
    } catch (error) {
      const failure = classifyAffiliateProviderFailure(error);
      console.error("[affiliate-ai]", { code: failure.code, status: failure.status });
      if (failure.code === "authentication" || failure.code === "quota" || failure.code === "rate_limit") {
        return failureBody(failure, failure.code !== "authentication");
      }
    }
  }
  const prompt = promotionPrompt(params);
  const complete = deps.complete ?? ((request) => completeWithGemini(request.model, request.prompt, key));
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let lastError = new AffiliateAiError(PROVIDER_MESSAGE, "provider", 502);
  for (const model of models) {
    let attempt = 0;
    while (attempt < 3) {
      attempt += 1;
      try {
        const text = await complete({ model, prompt });
        const data = parseAffiliatePromotionKit(text);
        return {
          status: 200,
          body: { success: true, data, provider: AFFILIATE_AI_PROVIDER, providerReady: true },
        };
      } catch (error) {
        lastError = classifyAffiliateProviderFailure(error);
        if (lastError.code === "retired_model") break;
        const allowed = attemptsFor(lastError.code);
        if (attempt >= allowed) {
          if (lastError.code === "network" || lastError.code === "provider") break;
          console.error("[affiliate-ai]", { code: lastError.code, status: lastError.status });
          return failureBody(lastError, lastError.code !== "authentication");
        }
        await sleep(backoffMs(attempt));
      }
    }
  }

  const terminal =
    lastError.code === "retired_model"
      ? new AffiliateAiError(PROVIDER_MESSAGE, "provider", 502)
      : lastError;
  console.error("[affiliate-ai]", { code: terminal.code, status: terminal.status });
  return failureBody(terminal, true);
}
