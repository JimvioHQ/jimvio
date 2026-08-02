import type { SupabaseClient } from "@supabase/supabase-js";

export type MatchCampaign = {
  id: string;
  title: string;
  description: string | null;
  campaign_type: string;
  allowed_platforms: string[] | null;
  total_budget: number;
  rate_per_1k_views: number;
  status: string;
  ends_at: string | null;
  required_hashtags?: string[] | null;
  join_config?: Record<string, unknown> | null;
  vendor?: { business_name?: string; business_country?: string | null } | null;
  score?: number;
  reasons?: string[];
};

export async function matchCampaignsForCreator(
  db: SupabaseClient,
  userId: string,
  limit = 12
): Promise<MatchCampaign[]> {
  const { data: influencer } = await db
    .from("influencers")
    .select("id, niche, total_followers, user_id")
    .eq("user_id", userId)
    .maybeSingle();

  let country = "";
  if (influencer?.user_id) {
    const { data: profile } = await db
      .from("profiles")
      .select("country")
      .eq("id", influencer.user_id)
      .maybeSingle();
    country = (profile?.country ?? "").toLowerCase();
  }

  const { data: campaigns } = await db
    .from("ugc_campaigns")
    .select(
      `
      id, title, description, campaign_type, allowed_platforms, total_budget,
      rate_per_1k_views, status, ends_at, required_hashtags, join_config,
      vendor:vendors!brand_id ( business_name, business_country )
    `
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(80);

  let pastTypes: string[] = [];
  let completionRate = 0.7;
  if (influencer?.id) {
    const { data: past } = await db
      .from("ugc_submissions")
      .select("status, campaign_id, ugc_campaigns!campaign_id(campaign_type)")
      .eq("influencer_id", influencer.id)
      .limit(100);
    const rows = past ?? [];
    const approved = rows.filter((r) => r.status === "approved").length;
    completionRate = rows.length ? approved / rows.length : 0.7;
    pastTypes = rows
      .map((r) => (r.ugc_campaigns as { campaign_type?: string } | null)?.campaign_type)
      .filter(Boolean) as string[];
  }

  const niches = ((influencer?.niche ?? []) as string[]).map((n) => n.toLowerCase());
  const followers = Number(influencer?.total_followers ?? 0);

  const scored = (campaigns ?? []).map((c) => {
    let score = 40;
    const reasons: string[] = [];
    const join = (c.join_config ?? {}) as Record<string, unknown>;
    const targetCountries = (join.countries as string[] | undefined) ?? [];
    const minFollowers = Number(join.min_followers ?? 0);

    if (country && targetCountries.length) {
      const hit = targetCountries.some((x) => x.toLowerCase() === country);
      if (hit) {
        score += 20;
        reasons.push("Country match");
      } else {
        score -= 15;
      }
    } else {
      score += 5;
    }

    if (followers && minFollowers) {
      if (followers >= minFollowers) {
        score += 15;
        reasons.push("Follower requirement met");
      } else score -= 20;
    }

    if (pastTypes.includes(c.campaign_type)) {
      score += 12;
      reasons.push("Matches past campaign type");
    }

    if (completionRate >= 0.8) {
      score += 10;
      reasons.push("Strong completion history");
    }

    const budget = Number(c.total_budget ?? 0);
    if (budget >= 1000) {
      score += 8;
      reasons.push("Healthy budget");
    }

    const hay = `${c.title} ${c.description ?? ""} ${(c.required_hashtags ?? []).join(" ")}`.toLowerCase();
    const nicheHits = niches.filter((n) => hay.includes(n)).length;
    if (nicheHits) {
      score += Math.min(15, nicheHits * 5);
      reasons.push("Category / niche fit");
    }

    if (c.ends_at) {
      const days = (new Date(c.ends_at).getTime() - Date.now()) / 86400000;
      if (days > 0 && days < 7) {
        score += 5;
        reasons.push("Closing soon");
      }
    }

    return {
      ...c,
      vendor: Array.isArray(c.vendor) ? c.vendor[0] : c.vendor,
      score: Math.max(0, Math.min(100, Math.round(score))),
      reasons: reasons.slice(0, 4),
    } as MatchCampaign;
  });

  return scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, limit);
}
