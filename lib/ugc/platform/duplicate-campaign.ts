import type { SupabaseClient } from "@supabase/supabase-js";
import { recordUgcActivity } from "./activity";
import { coerceFiniteNumber } from "@/lib/ugc/campaign-wizard-validation";

/** Deep-clone a campaign (fields, media, join settings) as a new draft. */
export async function duplicateCampaign(
  db: SupabaseClient,
  opts: {
    campaignId: string;
    brandId: string;
    actorUserId: string;
    titleSuffix?: string;
    openAsDraftPayload?: boolean;
  }
) {
  const { data: source, error } = await db
    .from("ugc_campaigns")
    .select("*, media:ugc_campaign_media(*)")
    .eq("id", opts.campaignId)
    .eq("brand_id", opts.brandId)
    .single();

  if (error || !source) throw new Error("Campaign not found");

  const media = (source.media ?? []) as Array<{
    type: string;
    url: string;
    thumbnail_url?: string | null;
    usage: string;
    platform_format?: string | null;
    order_index?: number;
  }>;

  const { media: _m, ...campaignRow } = source as typeof source & { media?: unknown };
  void _m;
  void campaignRow;

  const insertPayload = {
    brand_id: opts.brandId,
    title: `${source.title}${opts.titleSuffix ?? " (Copy)"}`,
    description: source.description,
    campaign_type: source.campaign_type,
    payment_model: source.payment_model ?? "per_views",
    status: "draft",
    rate_per_1k_views: source.rate_per_1k_views || 1,
    fixed_rate: source.fixed_rate ?? 0,
    total_budget: source.total_budget || 100,
    spent_budget: 0,
    max_payout_per_sub: source.max_payout_per_sub,
    allowed_platforms: source.allowed_platforms ?? ["tiktok", "instagram"],
    content_guidelines: source.content_guidelines,
    min_duration: source.min_duration,
    max_duration: source.max_duration,
    required_hashtags: source.required_hashtags ?? [],
    required_mentions: source.required_mentions ?? [],
    required_keywords: source.required_keywords ?? [],
    requires_face: source.requires_face ?? false,
    submission_count: 0,
    approved_count: 0,
    total_views_tracked: 0,
    starts_at: source.starts_at,
    ends_at: source.ends_at,
    content_deadline: source.content_deadline ?? null,
    live_at: source.live_at ?? null,
    submission_deadline: source.submission_deadline ?? null,
    review_starts_at: source.review_starts_at ?? null,
    review_ends_at: source.review_ends_at ?? null,
    payment_at: source.payment_at ?? null,
    music_track_url: source.music_track_url,
    music_artist_name: source.music_artist_name,
    promotion_target: source.promotion_target,
    promotion_target_url: source.promotion_target_url,
    join_mode: source.join_mode ?? "instant",
    join_config: source.join_config ?? {},
    max_participants: source.max_participants,
  };

  const { data: created, error: createErr } = await db
    .from("ugc_campaigns")
    .insert(insertPayload)
    .select("*")
    .single();

  if (createErr || !created) throw new Error(createErr?.message ?? "Failed to duplicate");

  if (media.length) {
    await db.from("ugc_campaign_media").insert(
      media.map((m, i) => ({
        campaign_id: created.id,
        type: m.type || "image",
        url: m.url,
        thumbnail_url: m.thumbnail_url ?? null,
        usage: m.usage || "example",
        platform_format: m.platform_format ?? null,
        order_index: m.order_index ?? i,
      }))
    );
  }

  await recordUgcActivity(db, {
    campaignId: created.id,
    eventType: "campaign_created",
    title: "Campaign duplicated",
    description: `Duplicated from "${source.title}"`,
    actorUserId: opts.actorUserId,
    metadata: { source_campaign_id: source.id },
  });

  const draftForm = {
    title: created.title,
    description: created.description ?? "",
    campaign_type: created.campaign_type,
    payment_model: created.payment_model ?? "per_views",
    rate_per_1k_views: coerceFiniteNumber(created.rate_per_1k_views) ?? 0,
    fixed_rate: coerceFiniteNumber(created.fixed_rate) ?? 0,
    total_budget: coerceFiniteNumber(created.total_budget) ?? 0,
    max_payout_per_sub: coerceFiniteNumber(created.max_payout_per_sub) ?? 0,
    allowed_platforms: Array.isArray(created.allowed_platforms) ? created.allowed_platforms : [],
    min_duration: coerceFiniteNumber(created.min_duration) ?? 0,
    max_duration: coerceFiniteNumber(created.max_duration) ?? 0,
    required_hashtags: created.required_hashtags ?? [],
    required_mentions: created.required_mentions ?? [],
    required_keywords: created.required_keywords ?? [],
    requires_face: Boolean(created.requires_face),
    music_track_url: created.music_track_url ?? "",
    music_artist_name: created.music_artist_name ?? "",
    promotion_target: created.promotion_target ?? "",
    promotion_target_url: created.promotion_target_url ?? "",
    media: media.map((m) => ({
      type: m.type || "image",
      url: m.url,
      usage: m.usage || "example",
    })),
    countries: Array.isArray((created.join_config as { countries?: string[] } | null)?.countries)
      ? ((created.join_config as { countries: string[] }).countries)
      : [],
    languages: "",
  };

  return { campaign: created, draftForm };
}
