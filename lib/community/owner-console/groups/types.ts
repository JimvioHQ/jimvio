/**
 * Owner Console Groups Management — domain types.
 * Product "Group" maps to DB `spaces`.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";

export const GROUP_PRIVACY_VALUES = [
  "public",
  "private",
  "invite_only",
  "hidden",
] as const;

export type GroupPrivacyMode = (typeof GROUP_PRIVACY_VALUES)[number];

export const GROUP_STATUS_VALUES = [
  "active",
  "archived",
  "hidden",
  "locked",
] as const;

export type GroupStatus = (typeof GROUP_STATUS_VALUES)[number];

export const GROUP_JOIN_POLICIES = [
  "everyone",
  "members",
  "invite_only",
  "approval",
] as const;

export type GroupJoinPolicy = (typeof GROUP_JOIN_POLICIES)[number];

export const GROUP_PERMISSION_ACTORS = [
  "owner",
  "admin",
  "moderator",
  "creator",
  "mentor",
  "vip",
  "verified",
  "member",
  "guest",
] as const satisfies readonly WorkspaceRole[];

export type GroupPermissionActor = (typeof GROUP_PERMISSION_ACTORS)[number];

export type GroupPermissionConfig = {
  whoCanJoin: GroupJoinPolicy;
  whoCanInvite: GroupPermissionActor[];
  whoCanCreateChannels: GroupPermissionActor[];
  whoCanUpload: GroupPermissionActor[];
  whoCanCreateEvents: GroupPermissionActor[];
  whoCanCreateCourses: GroupPermissionActor[];
  whoCanCreateVoiceRooms: GroupPermissionActor[];
  whoCanCreateLiveSessions: GroupPermissionActor[];
  whoCanGoLive: GroupPermissionActor[];
};

export type GroupDefaultChannelDraft = {
  name: string;
  roomType: string;
};

export type GroupDefaultContent = {
  welcomeMessage: string;
  defaultChannels: GroupDefaultChannelDraft[];
  defaultResources: string[];
  defaultRules: string;
};

export type OwnerGroupStaffMember = {
  userId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  staffRole: "moderator" | "admin";
  createdAt: string;
};

export type OwnerGroupMember = {
  userId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  status: string;
};

export type OwnerGroupListItem = {
  id: string;
  communityId: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  coverUrl: string | null;
  bannerUrl: string | null;
  color: string | null;
  privacy: GroupPrivacyMode;
  memberCount: number;
  channelCount: number;
  moderators: OwnerGroupStaffMember[];
  createdAt: string | null;
  lastActivityAt: string | null;
  updatedAt: string | null;
  sortOrder: number;
  status: GroupStatus;
  isActive: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  isHidden: boolean;
  isLocked: boolean;
  isSystem: boolean;
  welcomeMessage: string | null;
  rules: string | null;
  permissionConfig: GroupPermissionConfig;
  defaultContent: GroupDefaultContent;
};

export type OwnerGroupAnalytics = {
  growth: number;
  members: number;
  activity: number;
  knowledge: number;
  commerce: number;
  live: number;
  courses: number;
  retention: number;
};

export type CreateOwnerGroupInput = {
  communityId: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  color?: string | null;
  privacy?: GroupPrivacyMode;
  permissionConfig?: Partial<GroupPermissionConfig>;
  defaultContent?: Partial<GroupDefaultContent>;
  publish?: boolean;
};

export type UpdateOwnerGroupInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  color?: string | null;
  privacy?: GroupPrivacyMode;
  welcomeMessage?: string | null;
  rules?: string | null;
  permissionConfig?: Partial<GroupPermissionConfig>;
  defaultContent?: Partial<GroupDefaultContent>;
  isFeatured?: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
};

export type OwnerGroupAction =
  | "archive"
  | "restore"
  | "feature"
  | "unfeature"
  | "pin"
  | "unpin"
  | "hide"
  | "unhide"
  | "lock"
  | "unlock"
  | "duplicate"
  | "delete";

export const GROUP_SETTINGS_TABS = [
  "general",
  "branding",
  "privacy",
  "permissions",
  "moderators",
  "members",
  "channels",
  "resources",
  "analytics",
  "danger",
] as const;

export type GroupSettingsTab = (typeof GROUP_SETTINGS_TABS)[number];

export const GROUP_VIEW_MODES = ["cards", "table"] as const;
export type GroupViewMode = (typeof GROUP_VIEW_MODES)[number];

export const GROUP_SORT_OPTIONS = [
  "sort_order",
  "name",
  "members",
  "channels",
  "created",
  "activity",
] as const;
export type GroupSortOption = (typeof GROUP_SORT_OPTIONS)[number];

export const GROUP_FILTER_STATUSES = [
  "all",
  "active",
  "archived",
  "featured",
  "hidden",
  "locked",
] as const;
export type GroupFilterStatus = (typeof GROUP_FILTER_STATUSES)[number];
