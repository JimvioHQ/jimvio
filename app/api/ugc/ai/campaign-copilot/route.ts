import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { optionalBrandWorkspace, brandIdFromRequest } from "@/lib/ugc/enterprise/brand-access";
import { generateCampaignCopilot } from "@/lib/ugc/enterprise/campaign-copilot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const brandWs = await optionalBrandWorkspace(user.id, brandIdFromRequest(req));
  const { db, vendor } = brandWs;
  const body = await req.json().catch(() => ({}));

  const input = {
    productName: typeof body.productName === "string" ? body.productName : body.product_name,
    niche: typeof body.niche === "string" ? body.niche : undefined,
    goal: typeof body.goal === "string" ? body.goal : undefined,
    budget: body.budget != null ? Number(body.budget) : undefined,
    platforms: Array.isArray(body.platforms) ? body.platforms.map(String) : undefined,
    countries: Array.isArray(body.countries) ? body.countries.map(String) : undefined,
    tone: typeof body.tone === "string" ? body.tone : undefined,
    campaignType: body.campaignType ?? body.campaign_type,
  };

  const output = generateCampaignCopilot(input);

  const { data: session, error: saveErr } = await db
    .from("ugc_copilot_sessions")
    .insert({
      user_id: user.id,
      brand_id: vendor?.id ?? null,
      mode: "campaign",
      input,
      output,
    })
    .select("id, mode, created_at")
    .single();

  if (saveErr) {
    console.error("[ugc campaign copilot] session was not saved", { code: saveErr.code });
    return NextResponse.json({ error: "The campaign draft was not saved." }, { status: 500 });
  }

  return NextResponse.json({ session, output }, { status: 201 });
}
