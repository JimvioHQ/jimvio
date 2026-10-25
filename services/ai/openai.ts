import OpenAI from "openai";
import { resolveOpenAIModel } from "@/lib/ai/openai-runtime";

let _openai: OpenAI | null = null;

export type AiProviderStatus = {
  configured: boolean;
  provider: "openai" | "ai_gateway" | "none";
  reason?: string;
};

export function getAiProviderStatus(): AiProviderStatus {
  if (process.env.OPENAI_API_KEY?.trim()) {
    return { configured: true, provider: "openai" };
  }
  if (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim()
  ) {
    return { configured: true, provider: "ai_gateway" };
  }
  return {
    configured: false,
    provider: "none",
    reason:
      "No AI provider configured. Set OPENAI_API_KEY or AI_GATEWAY_API_KEY in the environment.",
  };
}

function getOpenAI(): OpenAI {
  if (_openai) return _openai;

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    _openai = new OpenAI({
      apiKey: openaiKey,
      baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined,
      timeout: 20_000,
      maxRetries: 1,
    });
    return _openai;
  }

  const gatewayKey =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    _openai = new OpenAI({
      apiKey: gatewayKey,
      baseURL:
        process.env.AI_GATEWAY_BASE_URL?.trim() ||
        "https://ai-gateway.vercel.sh/v1",
      timeout: 20_000,
      maxRetries: 1,
    });
    return _openai;
  }

  throw new Error(
    "OPENAI_API_KEY is not set. Add it to .env or configure AI_GATEWAY_API_KEY."
  );
}

export function describeAiError(error: unknown): {
  message: string;
  code?: string;
  status: number;
} {
  const err = error as {
    message?: string;
    code?: string;
    status?: number;
    error?: { message?: string; code?: string; type?: string };
  };
  const code = err?.code || err?.error?.code || err?.error?.type;
  const status = err?.status;
  const raw =
    err?.error?.message ||
    err?.message ||
    (error instanceof Error ? error.message : "AI generation failed");

  if (
    code === "credit_balance_exhausted" ||
    code === "insufficient_quota" ||
    /no credits remaining|insufficient_quota|credit_balance_exhausted|quota/i.test(raw)
  ) {
    return {
      message: "Jimvio AI is temporarily unavailable. Try again in a little while.",
      code: "insufficient_quota",
      status: 502,
    };
  }
  if (status === 429 || /rate limit/i.test(raw)) {
    return {
      message: "Jimvio AI is busy right now. Wait a moment and retry.",
      code: "rate_limit",
      status: 429,
    };
  }
  if (/API_KEY is not set|No AI provider|not configured/i.test(raw)) {
    return {
      message: "Jimvio AI is temporarily unavailable.",
      code: "provider_unconfigured",
      status: 503,
    };
  }
  return {
    message: "Jimvio AI couldn't finish that request just now.",
    code: typeof code === "string" ? code : undefined,
    status: typeof status === "number" ? status : 500,
  };
}

export interface ProductDescriptionParams {
  productName: string;
  category: string;
  keyFeatures: string[];
  targetAudience?: string;
  tone?: "professional" | "casual" | "exciting" | "luxury";
}

export interface MarketingCopyParams {
  productName: string;
  productType: string;
  price: number;
  currency?: string;
  platform: "email" | "social" | "ad" | "landing_page";
  tone?: "exciting" | "professional" | "urgent" | "storytelling";
}

export interface StoreSectionCopyParams {
  sectionType: string;
  storeName: string;
  current?: {
    headline?: unknown;
    subhead?: unknown;
    title?: unknown;
    cta?: unknown;
    body?: unknown;
  };
  tone?: "professional" | "luxury" | "creator" | "ecommerce" | "casual";
}

export interface AffiliateSuggestionsParams {
  affiliateNiche: string[];
  topPerformingCategories: string[];
  currentEarnings: number;
}

export class OpenAIService {
  async generateProductDescription(params: ProductDescriptionParams): Promise<string> {
    const prompt = `You are a professional e-commerce copywriter specializing in African markets.

Write a compelling product description for:
Product Name: ${params.productName}
Category: ${params.category}
Key Features: ${params.keyFeatures.join(", ")}
Target Audience: ${params.targetAudience || "General consumers"}
Tone: ${params.tone || "professional"}

Write a product description that:
1. Starts with a powerful hook
2. Highlights the top 3-5 benefits (not just features)
3. Includes relevant social proof language
4. Ends with a clear call to action
5. Is optimized for conversion
6. Is 150-250 words

Return ONLY the product description, no additional text.`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    return response.choices[0].message.content || "";
  }

  async generateStoreSectionCopy(params: StoreSectionCopyParams): Promise<{
    headline: string;
    subhead: string;
    body: string;
    cta: string;
  }> {
    const tone = params.tone || "ecommerce";
    const current = params.current || {};
    const prompt = `You are Jimvio storefront copywriter for African ecommerce brands.

Store: ${params.storeName}
Section type: ${params.sectionType}
Tone: ${tone}
Current headline: ${String(current.headline || current.title || "")}
Current subhead: ${String(current.subhead || "")}
Current body: ${String(current.body || "").slice(0, 400)}
Current CTA: ${String(current.cta || "")}

Return ONLY JSON with keys:
{
  "headline": "short punchy headline",
  "subhead": "one supporting sentence",
  "body": "optional short paragraph if useful, else empty string",
  "cta": "short button label"
}

Do not invent fake discounts, shipping claims, or unverifiable stats.`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 350,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content) as Record<string, unknown>;
    return {
      headline: String(parsed.headline || "").trim(),
      subhead: String(parsed.subhead || "").trim(),
      body: String(parsed.body || "").trim(),
      cta: String(parsed.cta || "").trim(),
    };
  }

  async generateMarketingCopy(params: MarketingCopyParams): Promise<{
    headline: string;
    subheadline: string;
    body: string;
    cta: string;
  }> {
    const platformGuide = {
      email: "email newsletter with subject line, preview text, and body",
      social: "social media post for Instagram/TikTok with emojis and hashtags",
      ad: "short Facebook/Google ad copy",
      landing_page: "landing page hero section copy",
    };

    const prompt = `You are a world-class direct response copywriter.

Create marketing copy for a ${platformGuide[params.platform]}:

Product: ${params.productName}
Type: ${params.productType}
Price: ${params.currency || "RWF"} ${params.price.toLocaleString()}
Tone: ${params.tone || "exciting"}

Return a JSON object with these exact keys:
{
  "headline": "...",
  "subheadline": "...", 
  "body": "...",
  "cta": "..."
}

Make it compelling, specific, and conversion-focused.`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content);
  }

  async generateAffiliateSuggestions(params: AffiliateSuggestionsParams): Promise<{
    topProducts: string[];
    strategy: string;
    estimatedEarnings: string;
    tips: string[];
  }> {
    const prompt = `You are an affiliate marketing expert specializing in African e-commerce.

Based on this affiliate's profile:
Niche: ${params.affiliateNiche.join(", ")}
Top Performing Categories: ${params.topPerformingCategories.join(", ")}
Current Monthly Earnings: RWF ${params.currentEarnings.toLocaleString()}

Provide personalized affiliate marketing recommendations.

Return a JSON object with:
{
  "topProducts": ["product category 1", "product category 2", ...],
  "strategy": "...",
  "estimatedEarnings": "...",
  "tips": ["tip 1", "tip 2", "tip 3"]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content);
  }

  async generateCampaignIdeas(params: {
    productName: string;
    category: string;
    targetPlatforms: string[];
    budget: number;
  }): Promise<{ ideas: Array<{ title: string; description: string; platform: string; estimatedReach: string }> }> {
    const prompt = `You are an influencer marketing strategist for African brands.

Create 4 campaign ideas for:
Product: ${params.productName}
Category: ${params.category}
Target Platforms: ${params.targetPlatforms.join(", ")}
Budget: RWF ${params.budget.toLocaleString()}

Return JSON with:
{
  "ideas": [
    {
      "title": "...",
      "description": "...",
      "platform": "...",
      "estimatedReach": "..."
    }
  ]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 700,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{"ideas":[]}';
    return JSON.parse(content);
  }

  async generateAffiliatePromotion(params: {
    productName: string;
    category: string;
    price: number;
    currency?: string;
    commissionRate: number;
    features?: string[];
    description?: string;
  }): Promise<{
    tiktokCaption: string;
    instagramCaption: string;
    youtubeTitle: string;
    facebookPost: string;
    threadsPost: string;
    xPost: string;
    emailCopy: string;
    blogIntro: string;
    keywords: string[];
    seoTitle: string;
    hashtags: string[];
    hooks: string[];
    scripts: string[];
  }> {
    const prompt = `You are Jimvio AI — an elite affiliate marketing copywriter for African creator commerce.

Product: ${params.productName}
Category: ${params.category}
Price: ${params.currency || "USD"} ${params.price}
Commission: ${params.commissionRate}%
Features: ${(params.features ?? []).join(", ") || "n/a"}
Description: ${(params.description ?? "").slice(0, 400) || "n/a"}

Generate platform-ready affiliate promotion assets. Keep copy punchy, conversion-focused, and culturally aware. Include a clear CTA to shop via the creator's tracked link (do not invent URLs).

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
  "scripts": ["15s script", "30s script", "60s script"]
}`;

    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 1400,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || "{}";
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const required = [
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
    for (const key of required) {
      if (typeof parsed[key] !== "string" || !(parsed[key] as string).trim()) {
        throw new Error(`AI response missing field: ${key}`);
      }
    }
    return {
      tiktokCaption: String(parsed.tiktokCaption),
      instagramCaption: String(parsed.instagramCaption),
      youtubeTitle: String(parsed.youtubeTitle),
      facebookPost: String(parsed.facebookPost),
      threadsPost: String(parsed.threadsPost),
      xPost: String(parsed.xPost),
      emailCopy: String(parsed.emailCopy),
      blogIntro: String(parsed.blogIntro),
      seoTitle: String(parsed.seoTitle),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.map(String)
        : [],
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map(String)
        : [],
      hooks: Array.isArray(parsed.hooks) ? parsed.hooks.map(String) : [],
      scripts: Array.isArray(parsed.scripts) ? parsed.scripts.map(String) : [],
    };
  }

  async chat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) {
    const response = await getOpenAI().chat.completions.create({
      model: resolveOpenAIModel().model,
      messages: [
        {
          role: "system",
          content: "You are JIMVIO's AI assistant. Help users with product descriptions, marketing, affiliate strategies, and platform guidance. Be concise, practical, and focused on African markets.",
        },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

    return response;
  }
}

export const aiService = new OpenAIService();
