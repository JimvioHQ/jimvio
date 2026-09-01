/**
 * Seed the default Group (space) + Discussion room for a newly created community.
 * Idempotent: skips when the community already has at least one active space.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureDefaultCommunityWorkspace(
  db: SupabaseClient,
  communityId: string
): Promise<{ spaceId: string | null; roomId: string | null; created: boolean }> {
  const admin = db as any;

  const { data: existingSpaces } = await admin
    .from("spaces")
    .select("id")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .limit(1);

  if (existingSpaces?.length) {
    const spaceId = existingSpaces[0].id as string;
    const { data: existingRooms } = await admin
      .from("rooms")
      .select("id, slug")
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    const discussionRoom =
      (existingRooms ?? []).find((r: { slug?: string | null }) => r.slug === "discussion") ??
      existingRooms?.[0];
    return {
      spaceId,
      roomId: (discussionRoom?.id as string) ?? null,
      created: false,
    };
  }

  const { data: space, error: spaceError } = await admin
    .from("spaces")
    .insert({
      community_id: communityId,
      name: "General",
      slug: "general",
      description: "Default group for community discussion",
      icon: "💬",
      color: "#6366F1",
      sort_order: 0,
      access_type: "free",
      privacy: "public",
      space_type: "discussion",
      is_active: true,
      room_count: 0,
      member_count: 0,
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (spaceError || !space?.id) {
    console.error("[ensureDefaultCommunityWorkspace] space insert failed", spaceError?.message);
    return { spaceId: null, roomId: null, created: false };
  }

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .insert({
      space_id: space.id,
      community_id: communityId,
      name: "Discussion",
      slug: "discussion",
      description: "Main community discussion",
      room_type: "chat",
      channel_kind: "discussion",
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
      visibility: "members",
      last_activity_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (roomError || !room?.id) {
    console.error("[ensureDefaultCommunityWorkspace] room insert failed", roomError?.message);
    return { spaceId: space.id, roomId: null, created: true };
  }

  await admin.from("spaces").update({ room_count: 1 }).eq("id", space.id);
  await admin
    .from("communities")
    .update({ space_count: 1 })
    .eq("id", communityId);

  return { spaceId: space.id, roomId: room.id, created: true };
}
