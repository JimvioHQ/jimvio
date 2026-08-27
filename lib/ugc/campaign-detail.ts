import type { UGCCampaign, UGCCampaignMedia } from "@/types/ugc";
import {
  getCampaignBadges,
  getCampaignBanner,
  getDaysRemaining,
  getDifficulty,
  getQualityScore,
} from "@/components/ugc/workspace/ugc-campaign-utils";

export type RewardType = "CPM" | "Fixed" | "Affiliate" | "Hybrid";

export type EligibilityLevel = "eligible" | "almost" | "not_eligible";

export type EligibilityRequirement = {
  id: string;
  label: string;
  met: boolean;
  detail?: string;
};

export type CreatorProfileSnapshot = {
  hasProfile: boolean;
  totalFollowers: number | null;
  platforms: string[];
  niche: string[];
  accountAgeDays: number | null;
  isVerified: boolean;
};

export type CampaignInsights = {
  competition: "Low" | "Medium" | "High";
  avgApprovalTime: string;
  avgEarnings: string;
  difficulty: "Easy" | "Medium" | "Hard";
  trendingScore: number;
  popularity: number;
};

export type TimelineEvent = {
  id: string;
  label: string;
  date: string | null;
  status: "done" | "current" | "upcoming";
};

export type ResourceItem = {
  id: string;
  label: string;
  url: string;
  type: "video" | "image" | "file" | "link";
  source: string;
  previewable: boolean;
};

const BOOKMARKS_KEY = "jimvio-ugc-bookmarks";

export function getBookmarkedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function toggleBookmark(campaignId: string): boolean {
  const ids = getBookmarkedIds();
  const next = new Set(ids);
  if (next.has(campaignId)) next.delete(campaignId);
  else next.add(campaignId);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...next]));
  return next.has(campaignId);
}

export function getRewardType(campaign: UGCCampaign): RewardType {
  const hasCpm = campaign.payment_model === "per_views" && campaign.rate_per_1k_views > 0;
  const hasFixed =
    campaign.payment_model === "fixed_per_content" && (campaign.fixed_rate ?? 0) > 0;
  if (campaign.campaign_type === "promotion") {
    if (hasCpm && hasFixed) return "Hybrid";
    return "Affiliate";
  }
  if (hasCpm && hasFixed) return "Hybrid";
  if (hasFixed) return "Fixed";
  return "CPM";
}

export function getCampaignCategory(campaign: UGCCampaign): string {
  const map: Record<string, string> = {
    clipping: "Clipping",
    ugc: "UGC",
    music_clipping: "Music",
    promotion: "Promotion",
  };
  return map[campaign.campaign_type] ?? "Campaign";
}

export function getCampaignTags(campaign: UGCCampaign): string[] {
  const tags = new Set<string>();
  tags.add(getCampaignCategory(campaign));
  getCampaignBadges(campaign).forEach((b) => tags.add(b));
  (campaign.required_hashtags ?? []).slice(0, 4).forEach((h) => tags.add(h.replace(/^#/, "")));
  return [...tags].slice(0, 8);
}

export function isFeaturedCampaign(campaign: UGCCampaign): boolean {
  return (
    campaign.total_budget >= 3000 ||
    (campaign.submission_count ?? 0) > 25 ||
    getCampaignBadges(campaign).includes("Trending")
  );
}

export function getRemainingBudget(campaign: UGCCampaign): number {
  return Math.max(0, campaign.total_budget - (campaign.spent_budget ?? 0));
}

export function getReservedBudget(campaign: UGCCampaign): number {
  const pending = Math.max(
    0,
    (campaign.submission_count ?? 0) - (campaign.approved_count ?? 0),
  );
  const perSub =
    campaign.payment_model === "fixed_per_content"
      ? campaign.fixed_rate ?? 0
      : (campaign.max_payout_per_sub ?? campaign.rate_per_1k_views * 10) * 0.25;
  return Math.min(getRemainingBudget(campaign), pending * perSub);
}

export function getRejectedEstimate(campaign: UGCCampaign): number {
  const total = campaign.submission_count ?? 0;
  const approved = campaign.approved_count ?? 0;
  return Math.max(0, total - approved - Math.ceil(total * 0.35));
}

export function estimateEarnings(
  campaign: UGCCampaign,
  input: {
    views?: number;
    sales?: number;
    clicks?: number;
    conversions?: number;
  },
): number {
  const reward = getRewardType(campaign);
  let total = 0;

  if (reward === "CPM" || reward === "Hybrid") {
    total += ((input.views ?? 0) / 1000) * campaign.rate_per_1k_views;
  }
  if (reward === "Fixed" || reward === "Hybrid") {
    total += (input.sales ?? 0) * (campaign.fixed_rate ?? 0);
  }
  if (reward === "Affiliate" || reward === "Hybrid") {
    total += (input.conversions ?? 0) * (campaign.fixed_rate ?? 50);
    total += (input.clicks ?? 0) * (campaign.rate_per_1k_views / 100);
  }

  const cap = campaign.max_payout_per_sub ?? campaign.total_budget;
  return Math.min(total, cap);
}

export function buildEligibility(
  campaign: UGCCampaign,
  profile: CreatorProfileSnapshot | null,
): { level: EligibilityLevel; score: number; requirements: EligibilityRequirement[] } {
  const requirements: EligibilityRequirement[] = [];
  const daysLeft = getDaysRemaining(campaign.ends_at);

  const activeReq: EligibilityRequirement = {
    id: "active",
    label: "Campaign is active",
    met: campaign.status === "active",
    detail: campaign.status !== "active" ? `Status: ${campaign.status}` : undefined,
  };
  requirements.push(activeReq);

  const timeReq: EligibilityRequirement = {
    id: "time",
    label: "Within campaign window",
    met: daysLeft === null || daysLeft > 0,
    detail: daysLeft === 0 ? "Campaign has ended" : undefined,
  };
  requirements.push(timeReq);

  const budgetReq: EligibilityRequirement = {
    id: "budget",
    label: "Budget available",
    met: getRemainingBudget(campaign) > 0,
  };
  requirements.push(budgetReq);

  const platformReq: EligibilityRequirement = {
    id: "platform",
    label: "Platform match",
    met:
      !profile?.hasProfile ||
      profile.platforms.length === 0 ||
      (campaign.allowed_platforms ?? []).some((p) =>
        profile.platforms.map((x) => x.toLowerCase()).includes(p.toLowerCase()),
      ),
    detail: (campaign.allowed_platforms ?? []).join(", "),
  };
  requirements.push(platformReq);

  const profileReq: EligibilityRequirement = {
    id: "profile",
    label: "Creator profile",
    met: profile?.hasProfile ?? false,
    detail: profile?.hasProfile ? undefined : "Complete your creator profile to join",
  };
  requirements.push(profileReq);

  const faceReq: EligibilityRequirement = {
    id: "face",
    label: "On-camera requirement",
    met: !campaign.requires_face || (profile?.hasProfile ?? false),
    detail: campaign.requires_face ? "Face required on camera" : "Not required",
  };
  requirements.push(faceReq);

  const joinConfig = campaign.join_config;
  const minFollowersRaw =
    joinConfig && typeof joinConfig === "object"
      ? Number((joinConfig as { eligibilityRules?: { minFollowers?: number } }).eligibilityRules?.minFollowers ?? 0)
      : 0;
  if (Number.isFinite(minFollowersRaw) && minFollowersRaw > 0) {
    const followers = profile?.totalFollowers ?? 0;
    requirements.push({
      id: "min_followers",
      label: "Minimum followers",
      met: followers >= minFollowersRaw,
      detail: `${followers.toLocaleString()} / ${minFollowersRaw.toLocaleString()}`,
    });
  }

  const metCount = requirements.filter((r) => r.met).length;
  const score = Math.round((metCount / requirements.length) * 100);

  let level: EligibilityLevel = "not_eligible";
  if (score >= 85 && activeReq.met && timeReq.met && budgetReq.met) level = "eligible";
  else if (score >= 55) level = "almost";

  return { level, score, requirements };
}

export function buildInsights(campaign: UGCCampaign): CampaignInsights {
  const subs = campaign.submission_count ?? 0;
  const competition = subs > 40 ? "High" : subs > 15 ? "Medium" : "Low";
  const approvalRate = subs > 0 ? (campaign.approved_count ?? 0) / subs : 0.65;

  return {
    competition,
    avgApprovalTime: subs > 20 ? "2–4 days" : "1–3 days",
    avgEarnings:
      campaign.payment_model === "fixed_per_content"
        ? `$${Math.round(campaign.fixed_rate ?? 0)}+`
        : `$${Math.round(campaign.rate_per_1k_views * 8)}–$${Math.round(
            (campaign.max_payout_per_sub ?? 400) * 0.6,
          )}`,
    difficulty: getDifficulty(campaign),
    trendingScore: getQualityScore(campaign),
    popularity: Math.min(99, Math.round(subs * 2.5 + approvalRate * 30)),
  };
}

export function buildTimeline(campaign: UGCCampaign): TimelineEvent[] {
  const now = Date.now();
  const events: TimelineEvent[] = [
    { id: "created", label: "Campaign created", date: campaign.created_at, status: "done" },
    {
      id: "applications",
      label: "Applications open",
      date: campaign.starts_at ?? campaign.created_at,
      status: "done",
    },
    {
      id: "started",
      label: "Campaign started",
      date: campaign.starts_at,
      status: campaign.starts_at && new Date(campaign.starts_at).getTime() > now ? "upcoming" : "done",
    },
    {
      id: "deadline",
      label: "Submission deadline",
      date: campaign.ends_at,
      status:
        campaign.ends_at && new Date(campaign.ends_at).getTime() < now
          ? "done"
          : campaign.ends_at
            ? "current"
            : "upcoming",
    },
    {
      id: "review",
      label: "Review period",
      date: campaign.ends_at,
      status: "upcoming",
    },
    {
      id: "payment",
      label: "Payment processing",
      date: campaign.ends_at,
      status: "upcoming",
    },
    {
      id: "ends",
      label: "Campaign ends",
      date: campaign.ends_at,
      status:
        campaign.ends_at && new Date(campaign.ends_at).getTime() < now ? "done" : "upcoming",
    },
  ];

  return events.map((e) => {
    if (!e.date) return { ...e, status: "upcoming" as const };
    const t = new Date(e.date).getTime();
    if (t < now) return { ...e, status: "done" as const };
    if (e.status === "current") return e;
    return { ...e, status: "upcoming" as const };
  });
}

export function buildResources(campaign: UGCCampaign): ResourceItem[] {
  const items: ResourceItem[] = [];

  const classifyUrl = (url: string): { type: ResourceItem["type"]; source: string } => {
    const lower = url.toLowerCase();
    if (lower.includes("drive.google")) return { type: "link", source: "Google Drive" };
    if (lower.includes("dropbox")) return { type: "link", source: "Dropbox" };
    if (lower.includes("cloudinary")) return { type: "image", source: "Cloudinary" };
    if (lower.includes("canva")) return { type: "link", source: "Canva" };
    if (lower.includes("figma")) return { type: "link", source: "Figma" };
    if (/\.(mp4|webm|mov)(\?|$)/i.test(url)) return { type: "video", source: "Video" };
    if (/\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)) return { type: "image", source: "Image" };
    return { type: "link", source: "Link" };
  };

  (campaign.media ?? []).forEach((m: UGCCampaignMedia) => {
    const { type, source } = classifyUrl(m.url);
    items.push({
      id: m.id,
      label: m.usage === "banner" ? "Cover asset" : m.usage === "example" ? "Example content" : "Brand creative",
      url: m.url,
      type: m.type === "video" ? "video" : m.type === "image" ? "image" : type,
      source,
      previewable: m.type === "video" || m.type === "image",
    });
  });

  if (campaign.music_track_url) {
    items.push({
      id: "music",
      label: campaign.music_artist_name ? `Music — ${campaign.music_artist_name}` : "Music track",
      url: campaign.music_track_url,
      type: "link",
      source: "Music",
      previewable: /\.(mp3|wav)(\?|$)/i.test(campaign.music_track_url),
    });
  }

  if (campaign.promotion_target_url) {
    items.push({
      id: "landing",
      label: campaign.promotion_target ?? "Landing page",
      url: campaign.promotion_target_url,
      type: "link",
      source: "Landing Page",
      previewable: false,
    });
  }

  if (campaign.vendor?.business_logo) {
    items.push({
      id: "logo",
      label: "Brand logo",
      url: campaign.vendor.business_logo,
      type: "image",
      source: "Brand Kit",
      previewable: true,
    });
  }

  return items;
}

export function buildFaqs(campaign: UGCCampaign): { q: string; a: string }[] {
  const reward = getRewardType(campaign);
  const platforms = (campaign.allowed_platforms ?? []).join(", ") || "approved platforms";
  return [
    {
      q: "How do I get paid?",
      a:
        reward === "Fixed"
          ? `You earn ${campaign.fixed_rate ?? 0} USD per approved submission, paid after manual review.`
          : reward === "CPM"
            ? `You earn $${campaign.rate_per_1k_views} per 1,000 verified views on approved content.`
            : `Earnings combine performance metrics and approved deliverables up to $${campaign.max_payout_per_sub ?? 400} per submission.`,
    },
    {
      q: "Which platforms are allowed?",
      a: `Post on ${platforms}. Submissions on other platforms will be rejected.`,
    },
    {
      q: "How long does review take?",
      a: "Most submissions are reviewed within 1–4 business days. You'll be notified when your content is approved or needs changes.",
    },
    {
      q: "Can I submit multiple videos?",
      a: "Yes, unless the campaign budget is fully allocated. Each submission is reviewed independently.",
    },
    {
      q: "What happens if my content is rejected?",
      a: "You'll receive feedback when possible. Rejected submissions don't earn payouts but you may submit again if the campaign is still active.",
    },
    {
      q: "Is payment guaranteed?",
      a: "Payouts are escrow-protected for approved content that meets all requirements. Fraudulent or non-compliant submissions are not paid.",
    },
  ];
}

export function scoreSimilarCampaign(current: UGCCampaign, other: UGCCampaign): number {
  if (current.id === other.id) return -1;
  let score = 0;
  if (other.campaign_type === current.campaign_type) score += 30;
  if (other.payment_model === current.payment_model) score += 15;
  if (other.brand_id === current.brand_id) score += 25;
  const sharedPlatforms = (other.allowed_platforms ?? []).filter((p) =>
    (current.allowed_platforms ?? []).includes(p),
  );
  score += sharedPlatforms.length * 8;
  const budgetDelta = Math.abs(other.total_budget - current.total_budget);
  if (budgetDelta < 1000) score += 12;
  return score;
}

export function pickSimilarCampaigns(
  current: UGCCampaign,
  pool: UGCCampaign[],
  limit = 4,
): UGCCampaign[] {
  return pool
    .map((c) => ({ c, score: scoreSimilarCampaign(current, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}

export function getAspectRatioForPlatform(platform: string): string {
  const map: Record<string, string> = {
    tiktok: "9:16",
    instagram: "9:16",
    youtube: "9:16",
    x: "16:9",
  };
  return map[platform.toLowerCase()] ?? "9:16";
}

export function formatCountdown(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `${hours}h ${mins}m left`;
}

export { getCampaignBanner, getDaysRemaining };
