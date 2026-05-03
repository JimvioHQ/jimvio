import OpenAI from "openai";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === "") {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env or configure the OpenAI client with an apiKey option."
      );
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    return response.choices[0].message.content || "";
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
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
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
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 700,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content || '{"ideas":[]}';
    return JSON.parse(content);
  }

  async chat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>) {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
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
