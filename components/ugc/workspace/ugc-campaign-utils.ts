import type { UGCCampaign } from "@/types/ugc";
import type { ContentTypeFilter, PlatformKey, SortKey } from "./ugc-tokens";

export function getCampaignBanner(c: UGCCampaign): string | null {
  return c.media?.find((m) => m.usage === "banner")?.url ?? null;
}

export function getCampaignPayoutLabel(c: UGCCampaign, formatMoney: (n: number, c?: string) => string): string {
  if (c.payment_model === "fixed_per_content") {
    return `${formatMoney(c.fixed_rate ?? 0, "USD")} / post`;
  }
  return `${formatMoney(c.rate_per_1k_views, "USD")} / 1K views`;
}

/** Reference-style reward line e.g. "$40 - $120 per video" */
export function getCampaignRewardLine(
  c: UGCCampaign,
  formatMoney: (n: number, c?: string) => string
): string {
  if (c.payment_model === "fixed_per_content") {
    const rate = c.fixed_rate ?? 0;
    const max = c.max_payout_per_sub ?? rate * 1.5;
    if (max > rate && rate > 0) {
      return `${formatMoney(rate, "USD")} - ${formatMoney(max, "USD")} per video`;
    }
    return `${formatMoney(rate, "USD")} per video`;
  }
  return `${formatMoney(c.rate_per_1k_views, "USD")} / 1K views`;
}

/** Blue performance-pay badge e.g. "$1.50/1K" */
export function getClipRateBadge(
  c: UGCCampaign,
  formatMoney: (n: number, c?: string) => string
): string | null {
  if (c.payment_model === "per_views" && c.rate_per_1k_views > 0) {
    return `${formatMoney(c.rate_per_1k_views, "USD")}/1K`;
  }
  if (c.payment_model === "fixed_per_content" && c.fixed_rate > 0) {
    return `${formatMoney(c.fixed_rate, "USD")}/clip`;
  }
  return null;
}

export function formatCreatorCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

export function getDaysRemaining(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDifficulty(c: UGCCampaign): "Easy" | "Medium" | "Hard" {
  const reqs =
    (c.required_hashtags?.length ?? 0) +
    (c.required_mentions?.length ?? 0) +
    (c.min_duration ? 1 : 0);
  if (reqs >= 4 || c.requires_face) return "Hard";
  if (reqs >= 2) return "Medium";
  return "Easy";
}

export function getQualityScore(c: UGCCampaign): number {
  const budgetScore = Math.min(40, (c.total_budget / 5000) * 40);
  const socialProof = Math.min(35, (c.submission_count ?? 0) / 50);
  const approval = c.submission_count
    ? ((c.approved_count ?? 0) / c.submission_count) * 25
    : 12;
  return Math.round(Math.min(99, budgetScore + socialProof + approval));
}

export function filterCampaigns(
  campaigns: UGCCampaign[],
  opts: {
    search: string;
    platform: PlatformKey;
    contentType: ContentTypeFilter;
  }
): UGCCampaign[] {
  let list = [...campaigns];
  const q = opts.search.trim().toLowerCase();

  if (opts.contentType !== "all") {
    list = list.filter((c) => c.campaign_type === opts.contentType);
  }

  if (opts.platform !== "all") {
    list = list.filter((c) =>
      (c.allowed_platforms ?? []).some((p) => p.toLowerCase() === opts.platform)
    );
  }

  if (q) {
    list = list.filter((c) => {
      const hay = [
        c.title,
        c.description,
        c.vendor?.business_name,
        c.campaign_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

export function sortCampaigns(campaigns: UGCCampaign[], sort: SortKey): UGCCampaign[] {
  const list = [...campaigns];
  switch (sort) {
    case "budget":
      return list.sort((a, b) => b.total_budget - a.total_budget);
    case "payout":
      return list.sort((a, b) => {
        const pa = a.payment_model === "fixed_per_content" ? a.fixed_rate : a.rate_per_1k_views;
        const pb = b.payment_model === "fixed_per_content" ? b.fixed_rate : b.rate_per_1k_views;
        return pb - pa;
      });
    case "popular":
      return list.sort((a, b) => (b.submission_count ?? 0) - (a.submission_count ?? 0));
    case "deadline":
      return list.sort((a, b) => {
        const da = a.ends_at ? Date.parse(a.ends_at) : Number.POSITIVE_INFINITY;
        const db = b.ends_at ? Date.parse(b.ends_at) : Number.POSITIVE_INFINITY;
        return da - db;
      });
    default:
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

export function getCampaignBadges(c: UGCCampaign): string[] {
  const badges: string[] = [];
  const created = new Date(c.created_at).getTime();
  if (Date.now() - created < 7 * 24 * 60 * 60 * 1000) badges.push("New");
  if ((c.submission_count ?? 0) > 30) badges.push("Trending");
  const days = getDaysRemaining(c.ends_at);
  if (days !== null && days <= 5) badges.push("Urgent");
  if (c.total_budget >= 3000) badges.push("High reward");
  return badges;
}
