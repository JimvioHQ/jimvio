import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  aiService,
  describeAiError,
  getAiProviderStatus,
} from "@/services/ai/openai";
import { createAffiliatePromotionResponse } from "@/lib/ai/affiliate-gemini";
import { listAccessibleGeminiModels } from "@/lib/ai/gemini-catalog";
import { GEMINI_API_KEY_ENV } from "@/lib/ai/gemini-model";
import {
  loadAffiliateProductContext,
  promotionInputFromContext,
} from "@/lib/ai/affiliate-product-context";
import { z } from "zod";

const generateSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("product_description"),
    productName: z.string(),
    category: z.string(),
    keyFeatures: z.array(z.string()),
    targetAudience: z.string().optional(),
    tone: z.enum(["professional", "casual", "exciting", "luxury"]).optional(),
  }),
  z.object({
    type: z.literal("marketing_copy"),
    productName: z.string(),
    productType: z.string(),
    price: z.number(),
    platform: z.enum(["email", "social", "ad", "landing_page"]),
    tone: z.enum(["exciting", "professional", "urgent", "storytelling"]).optional(),
  }),
  z.object({
    type: z.literal("store_section_copy"),
    sectionType: z.string().min(1).max(64),
    storeName: z.string().min(1).max(120),
    current: z
      .object({
        headline: z.unknown().optional(),
        subhead: z.unknown().optional(),
        title: z.unknown().optional(),
        cta: z.unknown().optional(),
        body: z.unknown().optional(),
      })
      .optional(),
    tone: z
      .enum(["professional", "luxury", "creator", "ecommerce", "casual"])
      .optional(),
  }),
  z.object({
    type: z.literal("affiliate_suggestions"),
    affiliateNiche: z.array(z.string()),
    topPerformingCategories: z.array(z.string()),
    currentEarnings: z.number(),
  }),
  z.object({
    type: z.literal("campaign_ideas"),
    productName: z.string(),
    category: z.string(),
    targetPlatforms: z.array(z.string()),
    budget: z.number(),
  }),
  z.object({
    type: z.literal("affiliate_promotion"),
    productId: z.string().trim().min(1).max(80),
    assetTypes: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
    platform: z.string().trim().max(40).optional(),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const params = generateSchema.parse(body);

    if (params.type === "affiliate_promotion") {
      const context = await loadAffiliateProductContext(params.productId, {
        assetTypes: params.assetTypes,
        platform: params.platform,
      });
      if (!context) {
        return NextResponse.json(
          { error: "That product is not available for affiliate promotion.", code: "not_found" },
          { status: 404 },
        );
      }
      const result = await createAffiliatePromotionResponse(promotionInputFromContext(context), {
        listModels: () => listAccessibleGeminiModels(process.env[GEMINI_API_KEY_ENV] ?? ""),
      });
      return NextResponse.json(
        { ...result.body, productId: context.productId },
        { status: result.status },
      );
    }

    const provider = getAiProviderStatus();
    if (!provider.configured) {
      return NextResponse.json(
        {
          error: provider.reason,
          code: "provider_unconfigured",
          providerReady: false,
        },
        { status: 503 }
      );
    }

    let result;

    switch (params.type) {
      case "product_description":
        result = await aiService.generateProductDescription(params);
        break;
      case "marketing_copy":
        result = await aiService.generateMarketingCopy(params);
        break;
      case "store_section_copy":
        result = await aiService.generateStoreSectionCopy(params);
        break;
      case "affiliate_suggestions":
        result = await aiService.generateAffiliateSuggestions(params);
        break;
      case "campaign_ideas":
        result = await aiService.generateCampaignIdeas(params);
        break;
      default:
        return NextResponse.json({ error: "Invalid generation type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      provider: provider.provider,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Jimvio AI could not use that request. Check the product and retry." },
        { status: 400 }
      );
    }
    const described = describeAiError(error);
    console.error("[ai-generate]", {
      code: described.code ?? null,
      status: described.status,
    });
    return NextResponse.json(
      {
        error: described.message,
        code: described.code,
        providerReady: getAiProviderStatus().configured,
      },
      { status: described.status }
    );
  }
}
