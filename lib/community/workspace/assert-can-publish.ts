/**
 * Server helper: resolve whether a user may publish / comment in a room (Channel).
 * Reuses the workspace posting policy + membership role engine.
 * Group Discussion rooms (channel_kind=discussion / slug=discussion) stay open for members.
 */

import type { createClient } from "@/lib/supabase/server";
import { DISCUSSION_PERMISSION_CONFIG } from "@/lib/community/owner-console/channels";
import {
  resolveChannelPostingAccess,
  type ChannelStaffLite,
} from "@/lib/community/workspace/channel-posting";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function isGroupDiscussionRoom(room: {
  channel_kind?: string | null;
  slug?: string | null;
  room_type?: string | null;
}): boolean {
  if (room.channel_kind === "discussion") return true;
  const slug = (room.slug ?? "").trim().toLowerCase();
  const type = (room.room_type ?? "").toLowerCase();
  return type === "chat" && /^(discussion|general|chat|lounge)$/.test(slug);
}

async function resolveRoomPostingAccess(
  supabase: Supabase,
  userId: string,
  roomId: string
) {
  const { data: room } = await supabase
    .from("rooms")
    .select(
      "id, community_id, space_id, permission_config, behavior_config, is_locked, channel_kind, slug, room_type"
    )
    .eq("id", roomId)
    .maybeSingle();

  if (!room) {
    return { room: null as null, access: null };
  }

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", room.community_id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type, space_access")
    .eq("community_id", room.community_id)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: staffRow } = await supabase
    .from("room_staff")
    .select("staff_role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  let channelStaff: ChannelStaffLite | null = null;
  if (staffRow?.staff_role === "admin") {
    channelStaff = { staffRole: "admin" };
  } else if (staffRow?.staff_role === "publisher") {
    channelStaff = { staffRole: "publisher" };
  } else if (staffRow?.staff_role === "moderator") {
    channelStaff = { staffRole: "moderator" };
  }

  // Group Discussion = open chat (Telegram/WhatsApp). Other channels keep posting modes.
  const permissionConfig = isGroupDiscussionRoom(room)
    ? { ...DISCUSSION_PERMISSION_CONFIG, publisherIds: [] }
    : room.permission_config;

  const access = resolveChannelPostingAccess({
    roleInput: {
      userId,
      ownerId: community?.owner_id,
      membership: membership?.status
        ? {
            role: membership.role ?? undefined,
            status: membership.status,
            plan_type: membership.plan_type,
            space_access: membership.space_access,
          }
        : null,
    },
    permission_config: permissionConfig,
    behavior_config: room.behavior_config,
    channelStaff,
  });

  return { room, access };
}

function lockedOrArchivedError(
  room: { is_locked?: boolean | null },
  space: { is_locked?: boolean | null; is_active?: boolean | null; archived_at?: string | null } | null
): { ok: false; status: number; error: string } | null {
  if (space && (space.is_active === false || space.archived_at)) {
    return {
      ok: false,
      status: 403,
      error: "This space is archived — posting is disabled.",
    };
  }
  if (space?.is_locked || room.is_locked) {
    return {
      ok: false,
      status: 403,
      error: "This discussion is locked — only staff can post.",
    };
  }
  return null;
}

export async function assertCanPublishInRoom(
  supabase: Supabase,
  userId: string,
  roomId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { room, access } = await resolveRoomPostingAccess(supabase, userId, roomId);
  if (!room || !access) {
    return { ok: false, status: 404, error: "Room not found" };
  }

  const { data: space } = room.space_id
    ? await supabase
        .from("spaces")
        .select("id, is_locked, is_active, archived_at")
        .eq("id", room.space_id)
        .maybeSingle()
    : { data: null };

  // Staff (moderation.delete / channel.manage) may still post in locked rooms.
  const canBypassLock =
    access.role === "owner" ||
    access.role === "admin" ||
    access.role === "moderator";
  if (!canBypassLock) {
    const locked = lockedOrArchivedError(room, space);
    if (locked) return locked;
  } else if (space && (space.is_active === false || space.archived_at)) {
    return {
      ok: false,
      status: 403,
      error: "This space is archived — posting is disabled.",
    };
  }

  if (!access.canPublish) {
    return {
      ok: false,
      status: 403,
      error: "Only authorized publishers can post in this channel.",
    };
  }
  return { ok: true };
}

export async function assertCanCommentInRoom(
  supabase: Supabase,
  userId: string,
  roomId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { room, access } = await resolveRoomPostingAccess(supabase, userId, roomId);
  if (!room || !access) {
    return { ok: false, status: 404, error: "Room not found" };
  }

  const { data: space } = room.space_id
    ? await supabase
        .from("spaces")
        .select("id, is_locked, is_active, archived_at")
        .eq("id", room.space_id)
        .maybeSingle()
    : { data: null };

  const canBypassLock =
    access.role === "owner" ||
    access.role === "admin" ||
    access.role === "moderator";
  if (!canBypassLock) {
    const locked = lockedOrArchivedError(room, space);
    if (locked) return locked;
  } else if (space && (space.is_active === false || space.archived_at)) {
    return {
      ok: false,
      status: 403,
      error: "This space is archived — commenting is disabled.",
    };
  }

  if (!access.canComment) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission to comment in this channel.",
    };
  }
  return { ok: true };
}
