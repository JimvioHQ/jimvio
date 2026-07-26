/**
 * Community Workspace Foundation — domain types.
 *
 * Product hierarchy: Community → Spaces (no Groups / Channels in product UI).
 * DB: Space ↔ `spaces` table · Room ↔ `rooms` table (realtime/message unit).
 *
 * WorkspaceSpace is the preferred view-model name. WorkspaceGroup remains as a
 * deprecated type alias for gradual migration.
 */

import type { SpaceType } from "./space-types";

export type { SpaceType } from "./space-types";

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

/**
 * Internal room product types — maps to DB `rooms.room_type` where possible.
 * Product term for a room under a Space is a Space area / room (not "Channel").
 */
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
  "knowledge",
  "media",
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
  knowledge: "knowledge",
  media: "media",
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
  knowledge: "resources",
  media: "resources",
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

/**
 * Internal mapping of a DB room under a Space.
 * Product term: Space area / room (legacy code may still say "Channel").
 */
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
  /** Channel posting policy — false hides the composer for non-publishers. */
  canPublish: boolean;
  unreadCount: number;
  memberCount: number;
  lastActivity: string | null;
  pinnedCount: number;
  isLocked: boolean;
  accessType: string;
  sortOrder: number | null;
};

/**
 * Preferred Space view model (Community → Spaces).
 * Maps to DB `spaces` table.
 */
export type WorkspaceSpace = {
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
  /** Extensible product type (discussion | voice | live | …). */
  spaceType?: SpaceType;
  /**
   * Internal rooms under this Space.
   * Product term is Space area/room; field name kept for compatibility.
   */
  channels: WorkspaceChannel[];
};

/**
 * @deprecated Use WorkspaceSpace. Alias retained for gradual migration.
 */
export type WorkspaceGroup = WorkspaceSpace;

/** Spaces that hold community-wide rooms (system Spaces, not member Spaces). */
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
  "posts",
  "members",
  "ai",
  "home",
] as const;

export type ChannelTabId = (typeof CHANNEL_TAB_IDS)[number];

/** Overview first — discussion (chat) is intentional, not the landing tab. */
export const CHANNEL_TABS: { id: ChannelTabId; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "pinned", label: "Pinned" },
  { id: "knowledge", label: "Knowledge" },
  { id: "files", label: "Files" },
  { id: "media", label: "Media" },
  { id: "members", label: "Members" },
  { id: "discussion", label: "Discussion" },
  { id: "threads", label: "Threads" },
  { id: "posts", label: "Posts" },
  { id: "ai", label: "AI" },
];
