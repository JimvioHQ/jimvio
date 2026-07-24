/**
 * Owner Console Roles & Permissions — domain types.
 */

import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type { PermissionCapability } from "@/lib/community/workspace/permissions";

export const SYSTEM_ROLE_KEYS = [
  "owner",
  "admin",
  "moderator",
  "creator",
  "mentor",
  "verified",
  "vip",
  "member",
  "guest",
] as const satisfies readonly WorkspaceRole[];

export type SystemRoleKey = (typeof SYSTEM_ROLE_KEYS)[number];

export const ROLE_VISIBILITY_VALUES = ["public", "staff", "hidden"] as const;
export type RoleVisibility = (typeof ROLE_VISIBILITY_VALUES)[number];

export const ROLE_EDITOR_TABS = [
  "overview",
  "permissions",
  "members",
  "groups",
  "channels",
  "analytics",
  "audit",
] as const;
export type RoleEditorTab = (typeof ROLE_EDITOR_TABS)[number];

export const ROLE_TEMPLATE_KEYS = [
  "community_admin",
  "community_moderator",
  "event_manager",
  "course_manager",
  "commerce_manager",
  "support_agent",
  "mentor",
  "content_creator",
] as const;
export type RoleTemplateKey = (typeof ROLE_TEMPLATE_KEYS)[number];

export type PermissionCategoryId =
  | "community"
  | "groups"
  | "channels"
  | "members"
  | "roles"
  | "moderation"
  | "content"
  | "knowledge"
  | "courses"
  | "events"
  | "live"
  | "commerce"
  | "analytics"
  | "ai"
  | "security"
  | "integrations"
  | "audit";

export type PermissionCatalogItem = {
  id: PermissionCapability;
  label: string;
  description: string;
  category: PermissionCategoryId;
  /** Product alias shown in docs (optional). */
  alias?: string;
};

export type OwnerRoleListItem = {
  id: string;
  communityId: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  priority: number;
  visibility: RoleVisibility;
  inheritsFrom: WorkspaceRole;
  capabilities: PermissionCapability[];
  groupIds: string[];
  channelIds: string[];
  isSystem: boolean;
  isProtected: boolean;
  isDefaultAssignment: boolean;
  memberCount: number;
  templateKey: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type OwnerRoleMember = {
  membershipId: string;
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  assignedAt: string | null;
};

export type OwnerRoleAuditEntry = {
  id: string;
  action: string;
  roleId: string | null;
  roleName: string | null;
  actorId: string;
  actorName: string | null;
  targetUserId: string | null;
  targetName: string | null;
  reason: string | null;
  createdAt: string;
};

export type OwnerRoleAnalytics = {
  membersPerRole: { roleId: string; name: string; count: number }[];
  mostUsedRoles: { roleId: string; name: string; count: number }[];
  inactiveRoles: { roleId: string; name: string }[];
  recentChanges: number;
  permissionUsage: { capability: string; roleCount: number }[];
};

export type OwnerRoleTemplate = {
  key: RoleTemplateKey;
  name: string;
  description: string;
  icon: string;
  color: string;
  inheritsFrom: WorkspaceRole;
  capabilities: PermissionCapability[];
};

export type CreateOwnerRoleInput = {
  communityId: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  priority?: number;
  visibility?: RoleVisibility;
  inheritsFrom?: WorkspaceRole;
  capabilities?: string[];
  groupIds?: string[];
  channelIds?: string[];
  isDefaultAssignment?: boolean;
  templateKey?: string | null;
};

export type UpdateOwnerRoleInput = {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  priority?: number;
  visibility?: RoleVisibility;
  inheritsFrom?: WorkspaceRole;
  capabilities?: string[];
  groupIds?: string[];
  channelIds?: string[];
  isDefaultAssignment?: boolean;
};

export type OwnerRoleAction =
  | "archive"
  | "restore"
  | "duplicate"
  | "delete"
  | "assign_members"
  | "remove_members";
