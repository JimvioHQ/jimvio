import { NextRequest, NextResponse } from "next/server";
import { loadAffiliateProductContext } from "@/lib/ai/affiliate-product-context";
import { signAffiliatePromotionTask } from "@/lib/ai/affiliate-task-token";
import { affiliateWorkspaceUserPrompt } from "@/lib/ai/affiliate-workspace";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  productId: z.string().trim().min(1).max(80),
  assetTypes: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
  platform: z.string().trim().max(40).optional(),
});

/** Authoritative product context for the existing Jimvio AI workspace. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const context = await loadAffiliateProductContext(parsed.data.productId, {
    assetTypes: parsed.data.assetTypes,
    platform: parsed.data.platform,
  });
  if (!context) {
    return NextResponse.json(
      { error: "That product is not available for affiliate promotion." },
      { status: 404 },
    );
  }

  const taskToken = signAffiliatePromotionTask(context);
  return NextResponse.json({
    prompt: affiliateWorkspaceUserPrompt({ name: context.name, platform: context.platform }),
    taskToken,
    context: {
      productId: context.productId,
      slug: context.slug,
      name: context.name,
      description: context.description,
      benefits: context.benefits,
      productUrl: context.productUrl,
      trackingUrl: context.trackingUrl,
      commissionPercent: context.commissionPercent,
      price: context.price,
      currency: context.currency,
      estimatedEarning: context.estimatedEarning,
      imageUrls: context.imageUrls,
      assetTypes: context.assetTypes,
      platform: context.platform,
    },
  });
}
