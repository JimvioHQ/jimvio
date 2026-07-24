/**
 * Owner Console Moderation Center — domain types.
 */

export const MODERATION_QUEUES = [
  "reports",
  "messages",
  "posts",
  "files",
  "spam",
  "scam",
  "appeals",
  "muted",
  "suspended",
  "banned",
  "automod",
  "audit",
] as const;
export type ModerationQueueId = (typeof MODERATION_QUEUES)[number];

export const REPORT_STATUSES = [
  "open",
  "reviewed",
  "dismissed",
  "actioned",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const APPEAL_STATUSES = [
  "open",
  "in_review",
  "approved",
  "rejected",
  "resolved",
] as const;
export type AppealStatus = (typeof APPEAL_STATUSES)[number];

export const AUTO_MOD_RULE_KEYS = [
  "spam_detection",
  "duplicate_detection",
  "scam_detection",
  "toxic_language",
  "nsfw",
  "blocked_words",
  "rate_limits",
  "link_protection",
  "invite_protection",
  "ai_moderation",
] as const;
export type AutoModRuleKey = (typeof AUTO_MOD_RULE_KEYS)[number];

export const MODERATION_ACTIONS = [
  "approve",
  "dismiss",
  "warn",
  "mute",
  "timeout",
  "suspend",
  "ban",
  "delete_content",
  "restore_content",
  "escalate",
  "assign_moderator",
  "add_note",
] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export type OwnerModerationOverview = {
  openReports: number;
  spam: number;
  scam: number;
  appeals: number;
  muted: number;
  suspended: number;
  banned: number;
  avgResponseHours: number | null;
};

export type OwnerReportListItem = {
  id: string;
  communityId: string;
  queue: string;
  status: ReportStatus;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  contentPreview: string | null;
  riskLevel: RiskLevel;
  aiClassification: Record<string, unknown>;
  evidence: unknown[];
  reporterId: string;
  reporterName: string | null;
  reportedUserId: string | null;
  reportedUserName: string | null;
  assignedModeratorId: string | null;
  assignedModeratorName: string | null;
  internalNote: string | null;
  contentDeletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt: string | null;
};

export type OwnerAppealItem = {
  id: string;
  communityId: string;
  status: AppealStatus;
  reason: string;
  appellantId: string;
  appellantName: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewerNote: string | null;
  relatedLogId: string | null;
  relatedReportId: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type OwnerAutoModRule = {
  id: string;
  communityId: string;
  ruleKey: AutoModRuleKey | string;
  name: string;
  description: string | null;
  enabled: boolean;
  severity: RiskLevel;
  action: string;
  config: Record<string, unknown>;
  updatedAt: string | null;
};

export type OwnerModerationLogItem = {
  id: string;
  action: string;
  reason: string | null;
  moderatorId: string;
  moderatorName: string | null;
  targetUserId: string;
  targetName: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type OwnerModeratedMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  mutedUntil: string | null;
  timeoutUntil: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
};

export type OwnerModerationAnalytics = {
  reportsPerDay: { date: string; count: number }[];
  spamPrevented: number;
  moderatorActivity: { moderatorId: string; name: string; actions: number }[];
  avgResponseHours: number | null;
  falsePositives: number;
  topCategories: { reason: string; count: number }[];
};
