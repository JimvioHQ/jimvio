import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import { analyzeSubmission } from "@/lib/ugc/platform/ai-review";
import { canReadCampaign, requireCampaignPermission } from "@/lib/ugc/enterprise/brand-access";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { user, db, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json();
  const campaignId =
    typeof body.campaign_id === "string" ? body.campaign_id.trim() : null;
  const submissionId =
    typeof body.submission_id === "string" ? body.submission_id.trim() : null;

  let requiredHashtags: string[] = Array.isArray(body.requiredHashtags)
    ? body.requiredHashtags.map(String)
    : Array.isArray(body.required_hashtags)
      ? body.required_hashtags.map(String)
      : [];
  let requiredMentions: string[] = Array.isArray(body.requiredMentions)
    ? body.requiredMentions.map(String)
    : Array.isArray(body.required_mentions)
      ? body.required_mentions.map(String)
      : [];
  let minDuration = body.minDuration ?? body.min_duration ?? null;
  let maxDuration = body.maxDuration ?? body.max_duration ?? null;
  let guidelines = body.guidelines ?? body.content_guidelines ?? null;
  let campaignTitle = body.campaignTitle ?? body.campaign_title ?? null;
  let platforms: string[] = Array.isArray(body.platforms)
    ? body.platforms.map(String)
    : Array.isArray(body.allowed_platforms)
      ? body.allowed_platforms.map(String)
      : [];

  if (campaignId) {
    const { data: campaign } = await db
      .from("ugc_campaigns")
      .select(
        "id, title, status, brand_id, required_hashtags, required_mentions, min_duration, max_duration, content_guidelines, allowed_platforms"
      )
      .eq("id", campaignId)
      .maybeSingle();
    if (campaign) {
      const readable = await canReadCampaign(db, user.id, {
        status: campaign.status,
        brand_id: campaign.brand_id,
      });
      if (!readable) {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      requiredHashtags = requiredHashtags.length
        ? requiredHashtags
        : campaign.required_hashtags ?? [];
      requiredMentions = requiredMentions.length
        ? requiredMentions
        : campaign.required_mentions ?? [];
      minDuration = minDuration ?? campaign.min_duration;
      maxDuration = maxDuration ?? campaign.max_duration;
      guidelines = guidelines ?? campaign.content_guidelines;
      campaignTitle = campaignTitle ?? campaign.title;
      platforms = platforms.length ? platforms : campaign.allowed_platforms ?? [];
    }
  }

  const input = {
    caption: body.caption ?? null,
    hashtags: Array.isArray(body.hashtags) ? body.hashtags.map(String) : [],
    requiredHashtags,
    requiredMentions,
    postUrl: body.post_url ?? body.postUrl ?? null,
    thumbnailUrl: body.thumbnail_url ?? body.thumbnailUrl ?? null,
    durationSeconds: body.duration_seconds ?? body.durationSeconds ?? null,
    minDuration: minDuration != null ? Number(minDuration) : null,
    maxDuration: maxDuration != null ? Number(maxDuration) : null,
    campaignTitle,
    guidelines,
    platforms,
    platform: body.platform ?? null,
  };

  const result = analyzeSubmission(input);

  const { data: stored, error: insErr } = await db
    .from("ugc_ai_reviews")
    .insert({
      user_id: user.id,
      campaign_id: campaignId,
      submission_id: submissionId,
      input,
      result,
      overall_score: result.overallScore,
    })
    .select("*")
    .single();

  if (insErr) {
    // Still return analysis even if persistence fails
    console.error("[ugc ai review store]", insErr.message);
    return NextResponse.json({ result, review: null });
  }

  if (submissionId) {
    const { data: sub } = await db
      .from("ugc_submissions")
      .select("id, influencer_id, campaign_id, influencers!influencer_id(user_id)")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub) return NextResponse.json({ result, review: stored });
    const inf = sub.influencers as unknown as { user_id?: string } | { user_id?: string }[] | null;
    const ownerId = Array.isArray(inf) ? inf[0]?.user_id : inf?.user_id;
    let allowed = ownerId === user.id;
    if (!allowed && sub.campaign_id) {
      const access = await requireCampaignPermission(user.id, sub.campaign_id, "campaigns.review");
      allowed = access.ok;
    }
    if (allowed) {
      await db.from("ugc_submissions").update({ ai_review: result }).eq("id", submissionId);
    }
  }

  return NextResponse.json({ result, review: stored });
}
