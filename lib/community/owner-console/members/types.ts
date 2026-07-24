/**
 * Owner Console Members Management — domain types.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";

export const MEMBER_STATUS_VALUES = [
  "active",
  "pending",
  "invited",
  "muted",
  "timeout",
  "suspended",
  "banned",
  "paused",
  "cancelled",
  "expired",
  "removed",
] as const;

export type MemberStatus = (typeof MEMBER_STATUS_VALUES)[number];

export const MEMBER_ASSIGNABLE_ROLES = [
  "admin",
  "moderator",
  "creator",
  "mentor",
  "vip",
  "verified",
  "member",
] as const satisfies readonly Exclude<WorkspaceRole, "owner" | "guest">[];

export type MemberAssignableRole = (typeof MEMBER_ASSIGNABLE_ROLES)[number];

export const MEMBER_VIEW_MODES = ["table", "cards"] as const;
export type MemberViewMode = (typeof MEMBER_VIEW_MODES)[number];

export const MEMBER_SORT_OPTIONS = [
  "joined_desc",
  "joined_asc",
  "name",
  "last_active",
  "contribution",
  "creator_score",
  "role",
] as const;
export type MemberSortOption = (typeof MEMBER_SORT_OPTIONS)[number];

export const MEMBER_FILTER_STATUSES = [
  "all",
  "active",
  "pending",
  "invited",
  "muted",
  "banned",
  "suspended",
  "staff",
] as const;
export type MemberFilterStatus = (typeof MEMBER_FILTER_STATUSES)[number];

export const MEMBER_PROFILE_TABS = [
  "overview",
  "activity",
  "communities",
  "groups",
  "channels",
  "knowledge",
  "courses",
  "commerce",
  "warnings",
  "moderation",
  "notes",
] as const;
export type MemberProfileTab = (typeof MEMBER_PROFILE_TABS)[number];

export type OwnerMemberBadge = {
  id: string;
  label: string;
  tone: "default" | "accent" | "success" | "warn";
};

export type OwnerMemberListItem = {
  id: string;
  communityId: string;
  userId: string;
  displayName: string;
  username: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole | string;
  status: MemberStatus;
  planType: string | null;
  groupIds: string[];
  groupNames: string[];
  channelCount: number;
  joinedAt: string | null;
  lastActiveAt: string | null;
  contributionScore: number;
  creatorScore: number;
  isVerified: boolean;
  isOnline: boolean;
  badges: OwnerMemberBadge[];
  mutedUntil: string | null;
  timeoutUntil: string | null;
  suspendedUntil: string | null;
  banReason: string | null;
};

export type OwnerMemberOverview = {
  total: number;
  online: number;
  pending: number;
  invited: number;
  banned: number;
  moderators: number;
  admins: number;
  creators: number;
  growth7d: number;
};

export type OwnerMemberInvite = {
  id: string;
  communityId: string;
  code: string;
  email: string | null;
  role: string;
  status: string;
  maxUses: number | null;
  usesCount: number;
  expiresAt: string | null;
  shareUrl: string;
  createdAt: string;
  note: string | null;
};

export type OwnerJoinRequest = {
  id: string;
  communityId: string;
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  reason: string | null;
  referralCode: string | null;
  referredByName: string | null;
  status: string;
  createdAt: string;
};

export type OwnerMemberNote = {
  id: string;
  body: string;
  authorId: string;
  authorName: string | null;
  createdAt: string;
};

export type OwnerModerationLog = {
  id: string;
  action: string;
  reason: string | null;
  moderatorId: string;
  moderatorName: string | null;
  createdAt: string;
};

export type OwnerMemberDetail = OwnerMemberListItem & {
  notes: OwnerMemberNote[];
  moderationHistory: OwnerModerationLog[];
  communitiesCount: number;
};

export type OwnerMemberAnalytics = {
  growth: { date: string; joins: number; leaves: number }[];
  retentionRate: number;
  activeRate: number;
  topContributors: { userId: string; displayName: string; score: number }[];
  mostHelpful: { userId: string; displayName: string; score: number }[];
  mostActiveGroups: { groupId: string; name: string; members: number }[];
};

export type OwnerMemberAction =
  | "change_role"
  | "assign_groups"
  | "remove_groups"
  | "assign_channels"
  | "mute"
  | "unmute"
  | "timeout"
  | "suspend"
  | "unsuspend"
  | "ban"
  | "unban"
  | "remove"
  | "add_note"
  | "approve_join"
  | "reject_join";

export type CreateMemberInviteInput = {
  communityId: string;
  email?: string | null;
  role?: string;
  maxUses?: number | null;
  expiresInDays?: number | null;
  note?: string | null;
};

export type BulkMemberActionInput = {
  communityId: string;
  membershipIds: string[];
  action:
    | "assign_role"
    | "assign_group"
    | "remove_group"
    | "mute"
    | "ban"
    | "export"
    | "announce";
  role?: string;
  groupId?: string;
  reason?: string;
  message?: string;
  durationMinutes?: number;
};
