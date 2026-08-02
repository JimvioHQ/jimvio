import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireInfluencer } from "@/lib/ugc/platform/auth";
import { generateCreatorCopilot } from "@/lib/ugc/enterprise/creator-copilot";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const { db } = await requireInfluencer(user.id);
  const body = await req.json().catch(() => ({}));

  const input = {
    campaignTitle: typeof body.campaignTitle === "string" ? body.campaignTitle : body.campaign_title,
    productName: typeof body.productName === "string" ? body.productName : body.product_name,
    niche: typeof body.niche === "string" ? body.niche : undefined,
    platforms: Array.isArray(body.platforms) ? body.platforms.map(String) : undefined,
    requiredHashtags: Array.isArray(body.requiredHashtags)
      ? body.requiredHashtags.map(String)
      : Array.isArray(body.required_hashtags)
        ? body.required_hashtags.map(String)
        : undefined,
    tone: typeof body.tone === "string" ? body.tone : undefined,
    goal: typeof body.goal === "string" ? body.goal : undefined,
  };

  const output = generateCreatorCopilot(input);

  const { data: session, error: saveErr } = await db
    .from("ugc_copilot_sessions")
    .insert({
      user_id: user.id,
      brand_id: null,
      mode: "creator",
      input,
      output,
    })
    .select("id, mode, created_at")
    .single();

  if (saveErr) return NextResponse.json({ error: saveErr.message }, { status: 500 });

  return NextResponse.json({ session, output }, { status: 201 });
}
