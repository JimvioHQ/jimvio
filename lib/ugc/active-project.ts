import type { UGCCampaign, UGCSubmission } from "@/types/ugc";
import {
  buildResources,
  formatCountdown,
  getCampaignBanner,
  getDaysRemaining,
  getRewardType,
} from "@/lib/ugc/campaign-detail";
import { getCampaignPayoutLabel } from "@/components/ugc/workspace/ugc-campaign-utils";
import type { ResourceItem } from "@/lib/ugc/campaign-detail";

export type ProjectStage =
  | "joined"
  | "preparing"
  | "creating"
  | "submitted"
  | "under_review"
  | "approved"
  | "paid"
  | "completed";

export type ProjectTask = {
  id: string;
  label: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "low" | "medium" | "high";
  deadline: string | null;
  progress: number;
};

export type ProjectMilestone = {
  id: string;
  label: string;
  status: "done" | "current" | "upcoming";
  date: string | null;
};

export type ActivityItem = {
  id: string;
  type:
    | "joined"
    | "resources"
    | "submission"
    | "approved"
    | "rejected"
    | "message"
    | "update"
    | "deadline"
    | "payment";
  title: string;
  detail?: string;
  at: string;
};

export type ProjectReminder = {
  id: string;
  label: string;
  tone: "info" | "warning" | "success";
};

export type ProjectStats = {
  estimatedEarnings: number;
  currentEarnings: number;
  approvedViews: number;
  pendingViews: number;
  rejectedViews: number;
  progressPercent: number;
};

export type ParticipantInfo = {
  status: string;
  joined_at?: string;
  eligibility_score?: number | null;
};

export function deriveProjectStage(
  campaign: UGCCampaign,
  submissions: UGCSubmission[],
  participant: ParticipantInfo | null,
): ProjectStage {
  if (campaign.status === "completed" || campaign.status === "cancelled") return "completed";
  const hasApproved = submissions.some((s) => s.status === "approved");
  const hasPending = submissions.some((s) => s.status === "pending");
  const hasRejected = submissions.some((s) => s.status === "rejected");
  const hasAny = submissions.length > 0;
  const paid = submissions.some((s) => Number(s.total_earnings) > 0 && s.status === "approved");

  if (paid && hasApproved) return "paid";
  if (hasApproved) return "approved";
  if (hasPending) return "under_review";
  if (hasAny) return "submitted";
  if (participant?.joined_at) return "preparing";
  return "joined";
}

export function deriveProjectStats(
  campaign: UGCCampaign,
  submissions: UGCSubmission[],
  stage: ProjectStage,
): ProjectStats {
  const approved = submissions.filter((s) => s.status === "approved");
  const pending = submissions.filter((s) => s.status === "pending");
  const rejected = submissions.filter((s) => s.status === "rejected");

  const approvedViews = approved.reduce((a, s) => a + (s.total_views_earned ?? 0), 0);
  const pendingViews = pending.reduce((a, s) => a + (s.total_views_earned ?? 0), 0);
  const rejectedViews = rejected.reduce((a, s) => a + (s.total_views_earned ?? 0), 0);
  const currentEarnings = submissions.reduce((a, s) => a + Number(s.total_earnings || 0), 0);

  let estimatedEarnings = currentEarnings;
  if (estimatedEarnings === 0) {
    if (campaign.payment_model === "fixed_per_content") {
      estimatedEarnings = campaign.fixed_rate ?? 0;
    } else {
      estimatedEarnings = Math.min(
        campaign.max_payout_per_sub ?? 400,
        (campaign.rate_per_1k_views ?? 0) * 10,
      );
    }
  }

  const stageWeights: Record<ProjectStage, number> = {
    joined: 10,
    preparing: 20,
    creating: 35,
    submitted: 50,
    under_review: 65,
    approved: 85,
    paid: 95,
    completed: 100,
  };

  return {
    estimatedEarnings,
    currentEarnings,
    approvedViews,
    pendingViews,
    rejectedViews,
    progressPercent: stageWeights[stage] ?? 10,
  };
}

export function buildProjectTasks(
  campaign: UGCCampaign,
  submissions: UGCSubmission[],
  flags: { briefRead?: boolean; assetsDownloaded?: boolean },
): ProjectTask[] {
  const ends = campaign.ends_at;
  const hasSubmission = submissions.length > 0;
  const hasPending = submissions.some((s) => s.status === "pending");
  const hasRejected = submissions.some((s) => s.status === "rejected");
  const hasApproved = submissions.some((s) => s.status === "approved");

  return [
    {
      id: "brief",
      label: "Read campaign brief",
      status: flags.briefRead ? "done" : "in_progress",
      priority: "high",
      deadline: ends,
      progress: flags.briefRead ? 100 : 40,
    },
    {
      id: "assets",
      label: "Download brand assets",
      status: flags.assetsDownloaded ? "done" : flags.briefRead ? "in_progress" : "todo",
      priority: "high",
      deadline: ends,
      progress: flags.assetsDownloaded ? 100 : flags.briefRead ? 50 : 0,
    },
    {
      id: "create",
      label: "Create video content",
      status: hasSubmission ? "done" : flags.assetsDownloaded ? "in_progress" : "todo",
      priority: "high",
      deadline: ends,
      progress: hasSubmission ? 100 : flags.assetsDownloaded ? 35 : 0,
    },
    {
      id: "submit",
      label: "Submit content link",
      status: hasSubmission ? "done" : "todo",
      priority: "high",
      deadline: ends,
      progress: hasSubmission ? 100 : 0,
    },
    {
      id: "review",
      label: "Wait for brand review",
      status: hasPending ? "in_progress" : hasApproved || hasRejected ? "done" : "todo",
      priority: "medium",
      deadline: null,
      progress: hasPending ? 60 : hasApproved || hasRejected ? 100 : 0,
    },
    {
      id: "fix",
      label: "Fix requested changes",
      status: hasRejected ? "blocked" : hasApproved ? "done" : "todo",
      priority: hasRejected ? "high" : "low",
      deadline: ends,
      progress: hasRejected ? 25 : hasApproved ? 100 : 0,
    },
    {
      id: "complete",
      label: "Complete campaign",
      status: hasApproved ? "done" : "todo",
      priority: "medium",
      deadline: ends,
      progress: hasApproved ? 100 : 0,
    },
  ];
}

export function buildMilestones(
  participant: ParticipantInfo | null,
  submissions: UGCSubmission[],
  campaign: UGCCampaign,
): ProjectMilestone[] {
  const joined = participant?.joined_at ?? campaign.created_at;
  const firstSub = submissions[0]?.created_at ?? null;
  const approved = submissions.find((s) => s.status === "approved");
  const stage = deriveProjectStage(campaign, submissions, participant);

  const items: ProjectMilestone[] = [
    { id: "m1", label: "Join campaign", status: "done", date: joined },
    { id: "m2", label: "Create content", status: firstSub ? "done" : stage === "preparing" ? "current" : "upcoming", date: firstSub },
    { id: "m3", label: "Submit content", status: firstSub ? "done" : "upcoming", date: firstSub },
    {
      id: "m4",
      label: "Approval",
      status: approved ? "done" : submissions.some((s) => s.status === "pending") ? "current" : "upcoming",
      date: approved?.reviewed_at ?? null,
    },
    {
      id: "m5",
      label: "Payment",
      status: stage === "paid" || stage === "completed" ? "done" : approved ? "current" : "upcoming",
      date: null,
    },
  ];

  return items;
}

export function buildActivityFeed(
  participant: ParticipantInfo | null,
  submissions: UGCSubmission[],
  campaign: UGCCampaign,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  if (participant?.joined_at) {
    items.push({
      id: "act-join",
      type: "joined",
      title: "Joined campaign",
      at: participant.joined_at,
    });
  }

  items.push({
    id: "act-resources",
    type: "resources",
    title: "Resources unlocked",
    detail: "Brand assets available in your workspace",
    at: participant?.joined_at ?? campaign.created_at,
  });

  submissions.forEach((s) => {
    items.push({
      id: `act-sub-${s.id}`,
      type: "submission",
      title: "Submission created",
      detail: `${s.platform} · ${s.post_url}`,
      at: s.created_at,
    });
    if (s.status === "approved" && s.reviewed_at) {
      items.push({
        id: `act-appr-${s.id}`,
        type: "approved",
        title: "Submission approved",
        at: s.reviewed_at,
      });
    }
    if (s.status === "rejected" && s.reviewed_at) {
      items.push({
        id: `act-rej-${s.id}`,
        type: "rejected",
        title: "Submission needs changes",
        detail: s.rejection_reason ?? undefined,
        at: s.reviewed_at,
      });
    }
  });

  if (campaign.ends_at) {
    items.push({
      id: "act-deadline",
      type: "deadline",
      title: "Submission deadline",
      detail: formatCountdown(campaign.ends_at) ?? undefined,
      at: campaign.ends_at,
    });
  }

  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function buildReminders(
  campaign: UGCCampaign,
  submissions: UGCSubmission[],
): ProjectReminder[] {
  const reminders: ProjectReminder[] = [];
  const days = getDaysRemaining(campaign.ends_at);

  if (days !== null && days <= 7 && days > 0) {
    reminders.push({
      id: "deadline",
      label: `Deadline in ${days} day${days === 1 ? "" : "s"}`,
      tone: days <= 2 ? "warning" : "info",
    });
  }

  if (submissions.length === 0 && campaign.status === "active") {
    reminders.push({
      id: "missing-sub",
      label: "You haven't submitted content yet",
      tone: "warning",
    });
  }

  if (submissions.some((s) => s.status === "pending")) {
    reminders.push({
      id: "review",
      label: "A submission is under brand review",
      tone: "info",
    });
  }

  if (submissions.some((s) => s.status === "approved" && Number(s.total_earnings) > 0)) {
    reminders.push({
      id: "payment",
      label: "Earnings are being tracked for payout",
      tone: "success",
    });
  }

  return reminders;
}

export function getProjectMeta(campaign: UGCCampaign) {
  return {
    banner: getCampaignBanner(campaign),
    rewardType: getRewardType(campaign),
    countdown: formatCountdown(campaign.ends_at),
    daysRemaining: getDaysRemaining(campaign.ends_at),
    resources: buildResources(campaign),
  };
}

export const STAGE_LABELS: Record<ProjectStage, string> = {
  joined: "Joined",
  preparing: "Preparing",
  creating: "Creating",
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  paid: "Paid",
  completed: "Completed",
};

export const STAGE_ORDER: ProjectStage[] = [
  "joined",
  "preparing",
  "creating",
  "submitted",
  "under_review",
  "approved",
  "paid",
  "completed",
];

export type { ResourceItem };
