/**
 * Server helper: resolve whether a user may publish / comment in a room (Channel).
 * Reuses the workspace posting policy + membership role engine.
 */

import type { createClient } from "@/lib/supabase/server";
import {
  resolveChannelPostingAccess,
  type ChannelStaffLite,
} from "@/lib/community/workspace/channel-posting";

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function resolveRoomPostingAccess(
  supabase: Supabase,
  userId: string,
  roomId: string
) {
  const { data: room } = await supabase
    .from("rooms")
    .select(
      "id, community_id, permission_config, behavior_config, is_locked"
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
    permission_config: room.permission_config,
    behavior_config: room.behavior_config,
    channelStaff,
  });

  return { room, access };
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
  if (!access.canComment) {
    return {
      ok: false,
      status: 403,
      error: "You do not have permission to comment in this channel.",
    };
  }
  return { ok: true };
}
