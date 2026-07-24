/**
 * Map DB rows ↔ Owner Moderation list items.
 */

import type {
  AppealStatus,
  OwnerAppealItem,
  OwnerAutoModRule,
  OwnerModeratedMember,
  OwnerModerationLogItem,
  OwnerReportListItem,
  ReportStatus,
  RiskLevel,
} from "./types";

export type ReportRow = {
  id: string;
  community_id: string;
  reporter_id: string;
  reported_user_id: string | null;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  queue: string | null;
  risk_level: string | null;
  ai_classification: unknown;
  evidence: unknown;
  content_preview: string | null;
  assigned_moderator_id: string | null;
  internal_note: string | null;
  content_deleted_at: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reporter?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  reported?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  assignee?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
};

export const REPORT_SELECT =
  "id, community_id, reporter_id, reported_user_id, target_type, target_id, reason, details, status, queue, risk_level, ai_classification, evidence, content_preview, assigned_moderator_id, internal_note, content_deleted_at, created_at, updated_at, reviewed_at";

function profileName(
  p:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null
    | undefined
): string | null {
  const row = Array.isArray(p) ? p[0] : p;
  return row?.full_name?.trim() || row?.username?.trim() || null;
}

export function asReportRow(row: unknown): ReportRow {
  return row as ReportRow;
}

export function mapReportRow(row: ReportRow): OwnerReportListItem {
  return {
    id: row.id,
    communityId: row.community_id,
    queue: row.queue || "reports",
    status: (row.status as ReportStatus) || "open",
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details,
    contentPreview: row.content_preview,
    riskLevel: (row.risk_level as RiskLevel) || "medium",
    aiClassification:
      row.ai_classification && typeof row.ai_classification === "object"
        ? (row.ai_classification as Record<string, unknown>)
        : {},
    evidence: Array.isArray(row.evidence) ? row.evidence : [],
    reporterId: row.reporter_id,
    reporterName: profileName(row.reporter),
    reportedUserId: row.reported_user_id,
    reportedUserName: profileName(row.reported),
    assignedModeratorId: row.assigned_moderator_id,
    assignedModeratorName: profileName(row.assignee),
    internalNote: row.internal_note,
    contentDeletedAt: row.content_deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reviewedAt: row.reviewed_at,
  };
}

export function mapAppealRow(row: {
  id: string;
  community_id: string;
  status: string;
  reason: string;
  appellant_id: string;
  reviewer_id: string | null;
  reviewer_note: string | null;
  related_log_id: string | null;
  related_report_id: string | null;
  created_at: string;
  resolved_at: string | null;
  appellant?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  reviewer?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
}): OwnerAppealItem {
  return {
    id: row.id,
    communityId: row.community_id,
    status: row.status as AppealStatus,
    reason: row.reason,
    appellantId: row.appellant_id,
    appellantName: profileName(row.appellant),
    reviewerId: row.reviewer_id,
    reviewerName: profileName(row.reviewer),
    reviewerNote: row.reviewer_note,
    relatedLogId: row.related_log_id,
    relatedReportId: row.related_report_id,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

export function mapAutoModRule(row: {
  id: string;
  community_id: string;
  rule_key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  severity: string;
  action: string;
  config: unknown;
  updated_at: string | null;
}): OwnerAutoModRule {
  return {
    id: row.id,
    communityId: row.community_id,
    ruleKey: row.rule_key,
    name: row.name,
    description: row.description,
    enabled: Boolean(row.enabled),
    severity: (row.severity as RiskLevel) || "medium",
    action: row.action,
    config:
      row.config && typeof row.config === "object"
        ? (row.config as Record<string, unknown>)
        : {},
    updatedAt: row.updated_at,
  };
}

export function mapModerationLog(row: {
  id: string;
  action: string;
  reason: string | null;
  moderator_id: string;
  target_user_id: string;
  metadata: unknown;
  created_at: string;
  moderator?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
  target?:
    | { full_name: string | null; username: string | null }
    | { full_name: string | null; username: string | null }[]
    | null;
}): OwnerModerationLogItem {
  return {
    id: row.id,
    action: row.action,
    reason: row.reason,
    moderatorId: row.moderator_id,
    moderatorName: profileName(row.moderator),
    targetUserId: row.target_user_id,
    targetName: profileName(row.target),
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
  };
}

export function mapModeratedMember(row: {
  id: string;
  user_id: string;
  role: string | null;
  status: string | null;
  muted_until: string | null;
  timeout_until: string | null;
  suspended_until: string | null;
  ban_reason: string | null;
  profiles?:
    | { full_name: string | null; username: string | null; avatar_url: string | null }
    | { full_name: string | null; username: string | null; avatar_url: string | null }[]
    | null;
}): OwnerModeratedMember {
  const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  return {
    membershipId: row.id,
    userId: row.user_id,
    displayName: p?.full_name?.trim() || p?.username?.trim() || "Member",
    username: p?.username ?? null,
    avatarUrl: p?.avatar_url ?? null,
    role: row.role ?? "member",
    status: row.status ?? "active",
    mutedUntil: row.muted_until,
    timeoutUntil: row.timeout_until,
    suspendedUntil: row.suspended_until,
    banReason: row.ban_reason,
  };
}
