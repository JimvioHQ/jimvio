/**
 * Channel posting policy — bridges Owner Console permission_config
 * with the workspace permission engine (no parallel auth).
 */

import type {
  ChannelBehaviorConfig,
  ChannelPermissionConfig,
} from "@/lib/community/owner-console/channels/types";
import {
  DISCUSSION_PERMISSION_CONFIG,
  normalizeBehaviorConfig,
  normalizePermissionConfig,
} from "@/lib/community/owner-console/channels/constants";
import {
  hasCapability,
  resolveWorkspaceRole,
  type MembershipLite,
  type ResolveRoleInput,
} from "./permissions";
import type { WorkspaceRole } from "./types";

/** Group Discussion rooms stay open for members (matches server assert-can-publish). */
export function isGroupDiscussionRoom(room: {
  channel_kind?: string | null;
  slug?: string | null;
  room_type?: string | null;
}): boolean {
  if (room.channel_kind === "discussion") return true;
  const slug = (room.slug ?? "").trim().toLowerCase();
  const type = (room.room_type ?? "").toLowerCase();
  return type === "chat" && /^(discussion|general|chat|lounge)$/.test(slug);
}

export type ChannelStaffLite = {
  staffRole: "moderator" | "admin" | "publisher";
};

export type ChannelPostingContext = {
  role: WorkspaceRole;
  userId: string | null | undefined;
  permissionConfig: ChannelPermissionConfig;
  behaviorConfig: ChannelBehaviorConfig;
  /** Assigned channel staff (moderator / admin / publisher). */
  channelStaff?: ChannelStaffLite | null;
};

export function normalizeChannelPostingConfig(raw: {
  permission_config?: unknown;
  behavior_config?: unknown;
}): {
  permissionConfig: ChannelPermissionConfig;
  behaviorConfig: ChannelBehaviorConfig;
} {
  return {
    permissionConfig: normalizePermissionConfig(raw.permission_config),
    behaviorConfig: normalizeBehaviorConfig(raw.behavior_config),
  };
}

/**
 * Whether the actor may publish a top-level message / post in this channel.
 * Groups stay open via discussion templates (postingMode everyone);
 * announcement-style channels default to staff publishers.
 */
export function canPublishInChannel(ctx: ChannelPostingContext): boolean {
  if (ctx.behaviorConfig.readOnly) return false;
  if (!ctx.userId) return false;
  if (ctx.role === "guest") return false;
  if (!hasCapability(ctx.role, "channel.write")) return false;
  if (ctx.role === "owner") return true;

  const staff = ctx.channelStaff?.staffRole;
  if (staff === "publisher") return true;
  if (staff === "admin" || staff === "moderator") {
    const mode = ctx.permissionConfig.postingMode;
    if (mode === "admins_only") {
      if (staff === "admin") return true;
    } else if (mode === "admins_moderators" || mode === "custom") {
      return true;
    } else if (
      ctx.permissionConfig.whoCanPost.includes("moderator") ||
      ctx.permissionConfig.whoCanPost.includes("admin")
    ) {
      return true;
    }
  }

  if (ctx.permissionConfig.publisherIds.includes(ctx.userId)) return true;

  return ctx.permissionConfig.whoCanPost.includes(
    ctx.role as ChannelPermissionConfig["whoCanPost"][number]
  );
}

/** Whether the actor may reply / comment when discussion is enabled. */
export function canCommentInChannel(ctx: ChannelPostingContext): boolean {
  if (!ctx.userId) return false;
  if (ctx.role === "guest") return false;
  if (ctx.role === "owner") return true;
  if (canPublishInChannel(ctx)) return true;
  return ctx.permissionConfig.whoCanReply.includes(
    ctx.role as ChannelPermissionConfig["whoCanReply"][number]
  );
}

export function canUploadMediaInChannel(ctx: ChannelPostingContext): boolean {
  if (ctx.role === "owner") return true;
  if (!ctx.userId || ctx.role === "guest") return false;
  if (!canPublishInChannel(ctx)) return false;
  return ctx.permissionConfig.whoCanUploadMedia.includes(
    ctx.role as ChannelPermissionConfig["whoCanUploadMedia"][number]
  );
}

export function resolveChannelPostingAccess(args: {
  roleInput: ResolveRoleInput;
  permission_config?: unknown;
  behavior_config?: unknown;
  channelStaff?: ChannelStaffLite | null;
  /** When set, discussion rooms force the open DISCUSSION_PERMISSION_CONFIG. */
  room?: {
    channel_kind?: string | null;
    slug?: string | null;
    room_type?: string | null;
  } | null;
}): {
  permissionConfig: ChannelPermissionConfig;
  behaviorConfig: ChannelBehaviorConfig;
  role: WorkspaceRole;
  canPublish: boolean;
  canComment: boolean;
} {
  const rawPermission =
    args.room && isGroupDiscussionRoom(args.room)
      ? { ...DISCUSSION_PERMISSION_CONFIG, publisherIds: [] }
      : args.permission_config;
  const { permissionConfig, behaviorConfig } = normalizeChannelPostingConfig({
    permission_config: rawPermission,
    behavior_config: args.behavior_config,
  });
  const role = resolveWorkspaceRole(args.roleInput);
  const ctx: ChannelPostingContext = {
    role,
    userId: args.roleInput.userId,
    permissionConfig,
    behaviorConfig,
    channelStaff: args.channelStaff,
  };
  return {
    permissionConfig,
    behaviorConfig,
    role,
    canPublish: canPublishInChannel(ctx),
    canComment: canCommentInChannel(ctx),
  };
}

export type { MembershipLite };
