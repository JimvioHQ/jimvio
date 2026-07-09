import type { UGCCampaign } from "@/types/ugc";
import type { CreatorProfileSnapshot } from "@/lib/ugc/campaign-detail";
import { buildEligibility } from "@/lib/ugc/campaign-detail";

export type UGCJoinMode = "instant" | "application" | "invite_only" | "hybrid";

export type UGCApplicationStatus =
  | "draft"
  | "submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "waitlisted"
  | "withdrawn"
  | "expired"
  | "cancelled";

export type UGCParticipationStatus =
  | "invited"
  | "accepted"
  | "rejected"
  | "banned"
  | "pending"
  | "waitlisted"
  | "withdrawn";

export type ResourceAccessMode = "immediate" | "after_approval" | "partial";

export type ApplicationFieldType =
  | "short_text"
  | "long_text"
  | "url"
  | "number"
  | "select"
  | "checkbox"
  | "multiselect"
  | "rating"
  | "file";

export type ApplicationField = {
  id: string;
  type: ApplicationFieldType;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: string[];
};

export type JoinConfig = {
  hybridAutoAcceptMinScore?: number;
  resourceAccess?: ResourceAccessMode;
  terms?: string[];
  applicationFields?: ApplicationField[];
  eligibilityRules?: {
    minFollowers?: number;
    minEngagement?: number;
    minAccountAgeDays?: number;
    requireVerified?: boolean;
  };
};

export type JoinEligibilityResult = {
  level: "eligible" | "almost" | "not_eligible";
  score: number;
  reasons: { id: string; label: string; met: boolean; detail?: string }[];
  blocked: boolean;
  blockReason?: string;
};

export type JoinAttemptResult = {
  status: UGCParticipationStatus;
  applicationStatus: UGCApplicationStatus;
  message: string;
  autoApproved: boolean;
  projectCreated: boolean;
};

export const DEFAULT_JOIN_CONFIG: JoinConfig = {
  hybridAutoAcceptMinScore: 85,
  resourceAccess: "immediate",
  terms: [
    "Campaign Rules",
    "Platform Rules",
    "Payment Policy",
    "Original Content Policy",
    "Copyright Policy",
    "Privacy Policy",
    "AI Content Policy",
    "FTC Disclosure",
  ],
  applicationFields: [
    { id: "portfolio_url", type: "url", label: "Portfolio URL", required: true },
    { id: "bio", type: "long_text", label: "Why are you a fit?", required: true },
    { id: "experience", type: "short_text", label: "Relevant experience" },
    { id: "avg_views", type: "number", label: "Average views per video" },
    { id: "followers", type: "number", label: "Total followers" },
    { id: "availability", type: "short_text", label: "Availability" },
  ],
};

export const DEFAULT_TERMS = DEFAULT_JOIN_CONFIG.terms!;

export function resolveJoinMode(campaign: UGCCampaign & { join_mode?: string | null }): UGCJoinMode {
  const mode = campaign.join_mode;
  if (mode === "application" || mode === "invite_only" || mode === "hybrid") return mode;
  return "instant";
}

export function resolveJoinConfig(campaign: UGCCampaign & { join_config?: JoinConfig | null }): JoinConfig {
  const raw = campaign.join_config;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_JOIN_CONFIG };
  return {
    ...DEFAULT_JOIN_CONFIG,
    ...raw,
    applicationFields: raw.applicationFields?.length
      ? raw.applicationFields
      : DEFAULT_JOIN_CONFIG.applicationFields,
    terms: raw.terms?.length ? raw.terms : DEFAULT_JOIN_CONFIG.terms,
  };
}

export function evaluateJoinEligibility(
  campaign: UGCCampaign & { join_mode?: string | null; join_config?: JoinConfig | null; max_participants?: number | null },
  profile: CreatorProfileSnapshot | null,
  participantCount: number,
): JoinEligibilityResult {
  const config = resolveJoinConfig(campaign);
  const base = buildEligibility(campaign, profile);
  const reasons: { id: string; label: string; met: boolean; detail?: string }[] = base.requirements.map((r) => ({
    id: r.id,
    label: r.label,
    met: r.met,
    detail: r.detail,
  }));

  const rules = config.eligibilityRules ?? {};

  if (rules.minFollowers != null && profile?.totalFollowers != null) {
    const met = profile.totalFollowers >= rules.minFollowers;
    reasons.push({
      id: "min_followers",
      label: "Minimum followers",
      met,
      detail: `${profile.totalFollowers.toLocaleString()} / ${rules.minFollowers.toLocaleString()}`,
    });
  }

  if (rules.requireVerified) {
    reasons.push({
      id: "verified",
      label: "Verified account",
      met: Boolean(profile?.isVerified),
    });
  }

  if (rules.minAccountAgeDays != null && profile?.accountAgeDays != null) {
    const met = profile.accountAgeDays >= rules.minAccountAgeDays;
    reasons.push({
      id: "account_age",
      label: "Account age",
      met,
      detail: `${profile.accountAgeDays}d / ${rules.minAccountAgeDays}d`,
    });
  }

  if (campaign.max_participants != null && participantCount >= campaign.max_participants) {
    reasons.push({
      id: "capacity",
      label: "Campaign capacity",
      met: false,
      detail: "Campaign is full",
    });
  }

  const metCount = reasons.filter((r) => r.met).length;
  const score = reasons.length ? Math.round((metCount / reasons.length) * 100) : base.score;

  let level: JoinEligibilityResult["level"] = "not_eligible";
  if (score >= 85) level = "eligible";
  else if (score >= 55) level = "almost";

  const capacityBlocked = campaign.max_participants != null && participantCount >= campaign.max_participants;
  const blocked =
    capacityBlocked ||
    campaign.status !== "active" ||
    (campaign.ends_at && new Date(campaign.ends_at) < new Date()) ||
    level === "not_eligible";

  let blockReason: string | undefined;
  if (campaign.status !== "active") blockReason = "Campaign is not active";
  else if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) blockReason = "Campaign has ended";
  else if (capacityBlocked) blockReason = "Campaign is full";
  else if (level === "not_eligible") blockReason = "Eligibility requirements not met";

  return { level, score, reasons, blocked, blockReason };
}

export function canAccessResources(
  mode: UGCJoinMode,
  resourceAccess: ResourceAccessMode,
  status: UGCParticipationStatus | null,
): boolean {
  if (resourceAccess === "immediate") return true;
  if (resourceAccess === "after_approval") return status === "accepted";
  if (resourceAccess === "partial") return status === "accepted" || status === "pending" || status === "invited";
  if (mode === "instant") return true;
  return status === "accepted";
}

export function canSubmitContent(status: UGCParticipationStatus | null): boolean {
  return status === "accepted";
}

export function resolveJoinOutcome(
  mode: UGCJoinMode,
  eligibilityScore: number,
  config: JoinConfig,
  existingStatus?: UGCParticipationStatus | null,
): JoinAttemptResult {
  if (mode === "invite_only") {
    if (existingStatus === "invited") {
      return {
        status: "accepted",
        applicationStatus: "approved",
        message: "Invite accepted. Your project is ready.",
        autoApproved: true,
        projectCreated: true,
      };
    }
    return {
      status: "rejected",
      applicationStatus: "rejected",
      message: "This campaign is invite-only.",
      autoApproved: false,
      projectCreated: false,
    };
  }

  if (mode === "instant") {
    return {
      status: "accepted",
      applicationStatus: "approved",
      message: "You joined the campaign.",
      autoApproved: true,
      projectCreated: true,
    };
  }

  const threshold = config.hybridAutoAcceptMinScore ?? 85;
  const autoApprove = mode === "hybrid" && eligibilityScore >= threshold;

  if (autoApprove) {
    return {
      status: "accepted",
      applicationStatus: "approved",
      message: "Application auto-approved based on your eligibility score.",
      autoApproved: true,
      projectCreated: true,
    };
  }

  return {
    status: "pending",
    applicationStatus: "pending",
    message: "Application submitted for brand review.",
    autoApproved: false,
    projectCreated: false,
  };
}

export function mapParticipantToApplicationStatus(
  status: UGCParticipationStatus | null,
): UGCApplicationStatus | null {
  if (!status) return null;
  switch (status) {
    case "accepted":
      return "approved";
    case "pending":
      return "pending";
    case "waitlisted":
      return "waitlisted";
    case "withdrawn":
      return "withdrawn";
    case "rejected":
      return "rejected";
    case "invited":
      return "submitted";
    case "banned":
      return "cancelled";
    default:
      return "pending";
  }
}

export function isTerminalApplicationStatus(status: UGCParticipationStatus | null): boolean {
  return status === "accepted" || status === "rejected" || status === "banned" || status === "withdrawn";
}
