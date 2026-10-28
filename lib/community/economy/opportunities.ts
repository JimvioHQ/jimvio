/**
 * Opportunities shown in the Creator OS economy panel.
 *
 * Built only from real, live UGC campaigns on Jimvio. There is no invented
 * catalog, no made-up brands or rewards, and no fabricated "AI match"
 * score or "invited" status.
 */

import type { CreatorOpportunity, EconomyOverviewInput, OpportunityKind } from "./types";

/** The fields of a public live campaign (GET /api/ugc/campaigns) used here. */
export type LiveCampaignLike = {
  id: string;
  title?: string | null;
  campaign_type?: string | null;
  payment_model?: string | null;
  fixed_rate?: number | null;
  rate_per_1k_views?: number | null;
  submission_deadline?: string | null;
  ends_at?: string | null;
  allowed_platforms?: string[] | null;
  vendor?: { business_name?: string | null } | null;
};

function kindFor(type: string | null | undefined): OpportunityKind {
  if (type === "ugc") return "ugc_campaign";
  if (type === "clipping" || type === "music_clipping") return "clipping_campaign";
  if (type === "promotion") return "sponsored_content";
  return "brand_campaign";
}

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function rewardFor(c: LiveCampaignLike): string {
  const fixed = Number(c.fixed_rate ?? 0);
  const perK = Number(c.rate_per_1k_views ?? 0);
  if (c.payment_model === "fixed_per_content" && fixed > 0) return `${money(fixed)} per approved video`;
  if (perK > 0) return `${money(perK)} per 1K views`;
  if (fixed > 0) return `${money(fixed)} per approved video`;
  return "See campaign";
}

export function opportunitiesFromCampaigns(campaigns: LiveCampaignLike[]): CreatorOpportunity[] {
  return campaigns
    .filter((c) => c?.id && c.title?.trim())
    .map((c) => {
      const deadline = (c.submission_deadline || c.ends_at || "").slice(0, 10);
      const platforms = (c.allowed_platforms ?? []).filter(Boolean);
      return {
        id: c.id,
        kind: kindFor(c.campaign_type),
        title: c.title!.trim(),
        reward: rewardFor(c),
        deadline,
        requirements: platforms.length ? [`Platforms: ${platforms.join(", ")}`] : [],
        difficulty: "medium",
        matchScore: 0,
        estimatedEarnings: 0,
        status: "open",
        href: `/ugc/${c.id}`,
        brand: c.vendor?.business_name?.trim() || undefined,
      } satisfies CreatorOpportunity;
    });
}

/**
 * Opportunities for the economy panel: live campaigns only. Callers that do
 * not pass campaigns get an empty list (never a placeholder catalog).
 */
export function deriveOpportunities(args: {
  base: string;
  overview: EconomyOverviewInput | null | undefined;
  campaigns?: LiveCampaignLike[];
}): CreatorOpportunity[] {
  return opportunitiesFromCampaigns(args.campaigns ?? []);
}
