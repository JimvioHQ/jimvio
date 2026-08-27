import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildPointsSnapshot } from "@/lib/community/points";
import { getCommunityOverviewStats, type CommunityOverviewStats } from "@/services/community/hub-data";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import { communityIsRestrictedToMembers } from "@/lib/community/join-policy";

export type CommunityWorkspacePayload = {
  community: {
    id: string;
    slug: string;
    name: string;
    avatar_url: string | null;
    member_count: number | null;
    owner_id: string;
    cover_image?: string | null;
    is_private?: boolean | null;
    visibility?: string | null;
    visibility_mode?: string | null;
    archived_at?: string | null;
    tagline?: string | null;
  };
  currentUserId: string;
  membership: {
    role: string;
    status: string;
    plan_type: string | null;
    space_access: string[] | null;
    created_at?: string | null;
  } | null;
  isOwner: boolean;
  isAdmin: boolean;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  overview: CommunityOverviewStats | null;
  ownerName: string | null;
  joinedAt: string | null;
};

export const loadCommunityWorkspace = cache(async function loadCommunityWorkspace(
  slug: string
): Promise<CommunityWorkspacePayload | null> {
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id, slug, name, avatar_url, member_count, owner_id, cover_image, is_private, tagline, visibility, visibility_mode, archived_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && communityIsRestrictedToMembers(community)) return null;

  const { data: membership } = user
    ? await supabase
        .from("community_memberships")
        .select("role, status, plan_type, space_access, created_at")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  const isOwner = Boolean(user && community.owner_id === user.id);
  const isAdmin = isOwner || membership?.role === "admin" || membership?.role === "moderator";

  const [profileRes, pointsRes, spacesRes, roomsRes, overview, ownerRes, staffRes] =
    await Promise.all([
      user
        ? supabase
            .from("profiles")
            .select("full_name, avatar_url, username")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("member_points")
            .select("total_points, level, streak_days")
            .eq("community_id", community.id)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("spaces")
        .select(
          "id, name, slug, icon, color, description, access_type, sort_order, space_type, created_at, is_featured, member_count"
        )
        .eq("community_id", community.id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("rooms")
        .select(
          "id, name, slug, room_type, space_id, is_locked, access_type, sort_order, permission_config, behavior_config, channel_kind"
        )
        .eq("community_id", community.id)
        .eq("is_active", true)
        .order("sort_order"),
      getCommunityOverviewStats(community.id, user?.id ?? null).catch((err) => {
        console.error("[loadCommunityWorkspace] overview stats failed:", err);
        return null;
      }),
      supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", community.owner_id)
        .maybeSingle(),
      user
        ? supabase
            .from("room_staff")
            .select("room_id, staff_role")
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] as { room_id: string; staff_role: string | null }[] }),
    ]);

  const staffByRoom = new Map<string, "moderator" | "admin" | "publisher">();
  for (const row of staffRes.data ?? []) {
    const role =
      row.staff_role === "admin"
        ? "admin"
        : row.staff_role === "publisher"
          ? "publisher"
          : "moderator";
    staffByRoom.set(row.room_id, role);
  }

  const roomsBySpace = new Map<string, NonNullable<typeof roomsRes.data>>();
  const canSeeRestricted =
    isOwner ||
    (membership?.status === "active" && Boolean(membership.role));
  const isPublicSpace = (accessType: string | null | undefined) => {
    const t = (accessType ?? "free").toLowerCase();
    return t !== "private" && t !== "paid" && t !== "premium";
  };
  for (const r of roomsRes.data ?? []) {
    if (!canSeeRestricted) {
      if (r.is_locked) continue;
      if (!isPublicSpace(r.access_type === "inherit" ? "free" : r.access_type)) continue;
    }
    const list = roomsBySpace.get(r.space_id) ?? [];
    list.push(r);
    roomsBySpace.set(r.space_id, list);
  }

  const spacesWithRooms: WorkspaceSpaceRow[] = (spacesRes.data ?? [])
    .filter((s) => canSeeRestricted || isPublicSpace(s.access_type))
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      icon: s.icon,
      color: (s as { color?: string | null }).color ?? null,
      description: (s as { description?: string | null }).description ?? null,
      access_type: s.access_type ?? "free",
      sort_order: s.sort_order,
      space_type:
        (s as { space_type?: string | null }).space_type ?? "discussion",
      created_at: (s as { created_at?: string | null }).created_at ?? null,
      is_featured: (s as { is_featured?: boolean | null }).is_featured ?? null,
      member_count: (s as { member_count?: number | null }).member_count ?? 0,
      rooms: (roomsBySpace.get(s.id) ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        room_type: r.room_type,
        space_id: r.space_id,
        is_locked: r.is_locked ?? false,
        access_type: r.access_type ?? "inherit",
        sort_order: r.sort_order,
        permission_config: r.permission_config ?? null,
        behavior_config: r.behavior_config ?? null,
        channel_kind: (r as { channel_kind?: string | null }).channel_kind ?? null,
        channel_staff_role: staffByRoom.get(r.id) ?? null,
      })),
    }));

  const points: PointsSnapshot | null = pointsRes.data
    ? buildPointsSnapshot(
        pointsRes.data.total_points ?? 0,
        pointsRes.data.level ?? 1,
        pointsRes.data.streak_days ?? 0
      )
    : null;

  return {
    community,
    currentUserId: user?.id ?? "",
    membership:
      membership?.role && membership?.status
        ? {
            role: membership.role,
            status: membership.status,
            plan_type: membership.plan_type,
            space_access: membership.space_access,
            created_at: membership.created_at,
          }
        : null,
    isOwner,
    isAdmin,
    profile: profileRes.data,
    points,
    spacesWithRooms,
    overview,
    ownerName: ownerRes.data?.full_name ?? ownerRes.data?.username ?? null,
    joinedAt: membership?.created_at ?? null,
  };
});
