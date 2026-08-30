import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";

function getService() {
  return createServiceRoleClient();
}

export async function canAccessRoom(userId: string, roomId: string): Promise<boolean> {
  const supabase = getService();
  const { data: room } = await supabase
    .from("rooms")
    .select("community_id, space_id, is_locked, access_type")
    .eq("id", roomId)
    .single();

  if (!room) return false;

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", room.community_id)
    .single();
  if (community?.owner_id === userId) return true;

  const membership = await getUserMembership(userId, room.community_id);
  if (!isMembershipActive(membership)) return false;

  // Unlocked rooms still require active membership (or owner above).
  if (!room.is_locked) return true;

  const accessType = room.access_type === "inherit" ? "paid" : room.access_type;
  if (accessType === "free") return true;
  // "paid" = active community membership (already verified above).
  // Course purchase/enrollment is enforced separately in course content APIs.
  if (accessType === "paid") return true;
  if (accessType === "premium") {
    return (
      membership?.plan_type === "yearly" ||
      membership?.plan_type === "lifetime" ||
      (membership?.space_access ?? []).map(String).includes(String(room.space_id))
    );
  }
  return false;
}

/** Public community + unlocked public space/room — anonymous SELECT only. */
export async function canReadPublicCommunityRoom(roomId: string): Promise<boolean> {
  const supabase = getService();
  const { data: room } = await supabase
    .from("rooms")
    .select("community_id, space_id, is_locked, access_type, is_active")
    .eq("id", roomId)
    .maybeSingle();

  if (!room || room.is_active === false) return false;
  if (room.is_locked) return false;
  const roomAccess = (room.access_type ?? "inherit").toLowerCase();
  if (roomAccess === "private" || roomAccess === "paid" || roomAccess === "premium") {
    return false;
  }

  const { data: community } = await supabase
    .from("communities")
    .select("is_private, is_active")
    .eq("id", room.community_id)
    .maybeSingle();
  if (!community || community.is_active === false || community.is_private === true) {
    return false;
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("access_type, is_active")
    .eq("id", room.space_id)
    .maybeSingle();
  if (!space || space.is_active === false) return false;
  const spaceAccess = (space.access_type ?? "free").toLowerCase();
  if (spaceAccess === "private" || spaceAccess === "paid" || spaceAccess === "premium") {
    return false;
  }

  return true;
}

/**
 * Authenticated engagement on public community content (like / react / share / comment).
 * Members always qualify; non-members may engage when the room is publicly readable.
 */
export async function canEngageWithRoom(userId: string, roomId: string): Promise<boolean> {
  if (await canAccessRoom(userId, roomId)) return true;
  return canReadPublicCommunityRoom(roomId);
}

export async function canAccessSpace(userId: string, spaceId: string): Promise<boolean> {
  const supabase = getService();
  const { data: space } = await supabase
    .from("spaces")
    .select("community_id, access_type")
    .eq("id", spaceId)
    .single();

  if (!space) return false;

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", space.community_id)
    .single();
  if (community?.owner_id === userId) return true;

  const membership = await getUserMembership(userId, space.community_id);
  if (!isMembershipActive(membership)) return false;

  if (space.access_type === "free") return true;
  if (space.access_type === "paid") return true;
  if (space.access_type === "premium") {
    return (
      membership?.plan_type === "yearly" ||
      membership?.plan_type === "lifetime" ||
      (membership?.space_access ?? []).map(String).includes(String(spaceId))
    );
  }
  return false;
}
