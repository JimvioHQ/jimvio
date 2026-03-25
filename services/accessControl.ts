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
  if (!room.is_locked) return true;

  const membership = await getUserMembership(userId, room.community_id);
  if (!isMembershipActive(membership)) return false;

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", room.community_id)
    .single();
  if (community?.owner_id === userId) return true;

  const accessType = room.access_type === "inherit" ? "paid" : room.access_type;
  if (accessType === "free") return true;
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

export async function canAccessSpace(userId: string, spaceId: string): Promise<boolean> {
  const supabase = getService();
  const { data: space } = await supabase
    .from("spaces")
    .select("community_id, access_type")
    .eq("id", spaceId)
    .single();

  if (!space) return false;
  if (space.access_type === "free") return true;

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", space.community_id)
    .single();
  if (community?.owner_id === userId) return true;

  const membership = await getUserMembership(userId, space.community_id);
  if (!isMembershipActive(membership)) return false;

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
