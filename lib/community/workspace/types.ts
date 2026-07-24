/**
 * Community Workspace Foundation — domain types (Phase 1).
 *
 * Group ↔ spaces table · Channel ↔ rooms table.
 * These view models are the single source of truth for future features.
 */

export const WORKSPACE_ROLES = [
  "owner",
  "admin",
  "moderator",
  "creator",
  "mentor",
  "verified",
  "vip",
  "member",
  "guest",
] as const;

export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number];

/** Custom role definitions — persisted in community_custom_roles. */
export type CustomRoleDefinition = {
  id: string;
  communityId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  priority: number;
  visibility: "public" | "staff" | "hidden";
  inheritsFrom: WorkspaceRole;
  capabilities: string[];
  groupIds: string[];
  channelIds: string[];
  isDefaultAssignment: boolean;
  isSystem: boolean;
  memberCount: number;
  createdAt: string | null;
  updatedAt: string | null;
};

/** Channel product types — maps to DB `rooms.room_type` where possible. */
export const CHANNEL_TYPES = [
  "discussion",
  "announcement",
  "signals",
  "resources",
  "voice",
  "live",
  "files",
  "course",
  "events",
  "qa",
] as const;

export type ChannelType = (typeof CHANNEL_TYPES)[number];

/** DB room_type → ChannelType */
export const ROOM_TYPE_TO_CHANNEL: Record<string, ChannelType> = {
  chat: "discussion",
  posts: "announcement",
  resources: "resources",
  voice: "voice",
  live: "live",
  course: "course",
  tasks: "events",
  files: "files",
  signals: "signals",
  qa: "qa",
};

/** ChannelType → preferred DB room_type when creating */
export const CHANNEL_TYPE_TO_ROOM: Record<ChannelType, string> = {
  discussion: "chat",
  announcement: "posts",
  signals: "chat",
  resources: "resources",
  voice: "voice",
  live: "live",
  files: "resources",
  course: "course",
  events: "tasks",
  qa: "chat",
};

export type ChannelVisibility = "public" | "members" | "premium" | "private";

export type GroupPrivacy = "public" | "private" | "premium";

export type WorkspacePermissions = {
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canInvite: boolean;
  canModerate: boolean;
  canPin: boolean;
  canUpload: boolean;
};

export type WorkspaceChannel = {
  id: string;
  groupId: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  type: ChannelType;
  /** Raw DB room_type for renderers */
  roomType: string;
  visibility: ChannelVisibility;
  permissions: WorkspacePermissions;
  unreadCount: number;
  memberCount: number;
  lastActivity: string | null;
  pinnedCount: number;
  isLocked: boolean;
  accessType: string;
  sortOrder: number | null;
};

export type WorkspaceGroup = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  cover: string | null;
  description: string | null;
  color: string | null;
  privacy: GroupPrivacy;
  rules: string | null;
  ownerId: string | null;
  adminIds: string[];
  moderatorIds: string[];
  memberCount: number;
  onlineCount: number;
  createdAt: string | null;
  tags: string[];
  featured: boolean;
  permissions: WorkspacePermissions;
  channels: WorkspaceChannel[];
};

/** Spaces that hold community-wide channels (not member Groups). */
export const SYSTEM_GROUP_SLUGS = [
  "general",
  "announcements",
  "resources",
  "channels",
] as const;

export type SystemGroupSlug = (typeof SYSTEM_GROUP_SLUGS)[number];

export const CHANNEL_TAB_IDS = [
  "discussion",
  "threads",
  "knowledge",
  "files",
  "media",
  "pinned",
  "events",
  "members",
  "ai",
  "home",
] as const;

export type ChannelTabId = (typeof CHANNEL_TAB_IDS)[number];

export const CHANNEL_TABS: { id: ChannelTabId; label: string }[] = [
  { id: "discussion", label: "Discussion" },
  { id: "threads", label: "Threads" },
  { id: "knowledge", label: "Knowledge" },
  { id: "files", label: "Files" },
  { id: "media", label: "Media" },
  { id: "pinned", label: "Pinned" },
  { id: "events", label: "Events" },
  { id: "members", label: "Members" },
  { id: "ai", label: "AI" },
  { id: "home", label: "Overview" },
];
