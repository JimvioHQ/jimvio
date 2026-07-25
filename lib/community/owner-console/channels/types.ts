/**
 * Owner Console Channels Management — domain types.
 * Product "Channel" maps to DB `rooms` (parent Group = `spaces`).
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";

export const OWNER_CHANNEL_KINDS = [
  "discussion",
  "announcement",
  "resources",
  "knowledge",
  "qa",
  "signals",
  "files",
  "media",
  "voice",
  "live",
  "courses",
  "events",
  "marketplace",
  "commerce",
  "support",
  "ai",
] as const;

export type OwnerChannelKind = (typeof OWNER_CHANNEL_KINDS)[number];

export const CHANNEL_VISIBILITY_VALUES = [
  "public",
  "members",
  "private",
  "invite_only",
  "hidden",
] as const;

export type ChannelVisibilityMode = (typeof CHANNEL_VISIBILITY_VALUES)[number];

export const CHANNEL_STATUS_VALUES = [
  "active",
  "archived",
  "hidden",
  "locked",
] as const;

export type ChannelStatus = (typeof CHANNEL_STATUS_VALUES)[number];

export const CHANNEL_PERMISSION_ACTORS = [
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

export type ChannelPermissionActor = (typeof CHANNEL_PERMISSION_ACTORS)[number];

/**
 * Channel posting mode (broadcast-first by default).
 * Maps onto whoCanPost + publisherIds — no parallel auth system.
 */
export const CHANNEL_POSTING_MODES = [
  "everyone",
  "admins_moderators",
  "admins_only",
  "custom",
] as const;

export type ChannelPostingMode = (typeof CHANNEL_POSTING_MODES)[number];

export type ChannelPermissionConfig = {
  /** Broadcast policy — drives whoCanPost presets when not custom. */
  postingMode: ChannelPostingMode;
  /** Explicit publishers for custom mode (and additive grants). */
  publisherIds: string[];
  whoCanView: ChannelPermissionActor[];
  whoCanPost: ChannelPermissionActor[];
  /** Comments / replies under posts & threads. */
  whoCanReply: ChannelPermissionActor[];
  whoCanUpload: ChannelPermissionActor[];
  whoCanUploadMedia: ChannelPermissionActor[];
  whoCanUploadFiles: ChannelPermissionActor[];
  whoCanCreatePolls: ChannelPermissionActor[];
  whoCanPin: ChannelPermissionActor[];
  whoCanModerate: ChannelPermissionActor[];
  whoCanGoLive: ChannelPermissionActor[];
  whoCanCreateThreads: ChannelPermissionActor[];
  whoCanMentionEveryone: ChannelPermissionActor[];
};

export type ChannelBehaviorConfig = {
  slowModeSeconds: number;
  readOnly: boolean;
  welcomeMessage: string;
  autoArchiveDays: number | null;
  defaultTabs: string[];
};

export type ChannelAutomationConfig = {
  autoWelcome: boolean;
  autoArchive: boolean;
  autoAiSummary: boolean;
  autoPinRules: boolean;
  autoModeration: boolean;
  autoKnowledgeCapture: boolean;
};

export type OwnerChannelStaffMember = {
  userId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  staffRole: "moderator" | "admin" | "publisher";
  createdAt: string;
};

export type OwnerChannelMember = {
  userId: string;
  fullName: string | null;
  username: string | null;
  avatarUrl: string | null;
  role: string;
  joinedAt: string | null;
  status: string;
};

export type OwnerChannelListItem = {
  id: string;
  communityId: string;
  groupId: string;
  groupName: string;
  groupSlug: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  emoji: string | null;
  color: string | null;
  kind: OwnerChannelKind;
  roomType: string;
  visibility: ChannelVisibilityMode;
  memberCount: number;
  messageCount: number;
  pinnedCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sortOrder: number;
  status: ChannelStatus;
  isActive: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  isHidden: boolean;
  isLocked: boolean;
  tags: string[];
  moderators: OwnerChannelStaffMember[];
  welcomeMessage: string | null;
  permissionConfig: ChannelPermissionConfig;
  behaviorConfig: ChannelBehaviorConfig;
  automationConfig: ChannelAutomationConfig;
};

export type OwnerChannelAnalytics = {
  messages: number;
  activeMembers: number;
  growth: number;
  engagement: number;
  knowledgeGenerated: number;
  filesShared: number;
  commerceActivity: number;
  liveActivity: number;
};

export type CreateOwnerChannelInput = {
  communityId: string;
  groupId: string;
  name: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  emoji?: string | null;
  color?: string | null;
  kind?: OwnerChannelKind;
  visibility?: ChannelVisibilityMode;
  permissionConfig?: Partial<ChannelPermissionConfig>;
  behaviorConfig?: Partial<ChannelBehaviorConfig>;
  automationConfig?: Partial<ChannelAutomationConfig>;
  tags?: string[];
  publish?: boolean;
  templateId?: string;
};

export type UpdateOwnerChannelInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  icon?: string | null;
  emoji?: string | null;
  color?: string | null;
  kind?: OwnerChannelKind;
  groupId?: string;
  visibility?: ChannelVisibilityMode;
  welcomeMessage?: string | null;
  permissionConfig?: Partial<ChannelPermissionConfig>;
  behaviorConfig?: Partial<ChannelBehaviorConfig>;
  automationConfig?: Partial<ChannelAutomationConfig>;
  tags?: string[];
  isFeatured?: boolean;
  isPinned?: boolean;
  isHidden?: boolean;
  isLocked?: boolean;
  sortOrder?: number;
};

export type OwnerChannelAction =
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
  | "clone"
  | "delete"
  | "move";

export const CHANNEL_SETTINGS_TABS = [
  "general",
  "branding",
  "permissions",
  "members",
  "moderators",
  "content",
  "automation",
  "analytics",
  "danger",
] as const;

export type ChannelSettingsTab = (typeof CHANNEL_SETTINGS_TABS)[number];

export const CHANNEL_VIEW_MODES = ["cards", "table"] as const;
export type ChannelViewMode = (typeof CHANNEL_VIEW_MODES)[number];

export const CHANNEL_SORT_OPTIONS = [
  "sort_order",
  "name",
  "group",
  "activity",
  "messages",
  "created",
] as const;
export type ChannelSortOption = (typeof CHANNEL_SORT_OPTIONS)[number];

export const CHANNEL_FILTER_STATUSES = [
  "all",
  "active",
  "archived",
  "featured",
  "hidden",
  "locked",
  "unread",
  "recent",
] as const;
export type ChannelFilterStatus = (typeof CHANNEL_FILTER_STATUSES)[number];

export type ChannelTemplateId =
  | "general_chat"
  | "announcements"
  | "introductions"
  | "wins"
  | "resources"
  | "signals"
  | "qa"
  | "voice"
  | "live"
  | "knowledge"
  | "course_discussion"
  | "marketplace"
  | "support"
  | "campaigns"
  | "media"
  | "files"
  | "events";
