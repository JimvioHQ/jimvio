import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { aiService } from "@/services/ai/openai";
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
]);

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const params = generateSchema.parse(body);

    let result;

    switch (params.type) {
      case "product_description":
        result = await aiService.generateProductDescription(params);
        break;
      case "marketing_copy":
        result = await aiService.generateMarketingCopy(params);
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

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.errors }, { status: 400 });
    }
    console.error("AI generation error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
