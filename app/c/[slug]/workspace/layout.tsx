import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/community/workspace/WorkspaceShell";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import type { WorkspaceSection } from "@/types/workspace";

export default async function CommunityWorkspaceLayout({
  children,
  params,
  searchParams,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ section?: string; view?: string }>;
}) {
  const { slug } = await params;
  const { section = "feed", view = "member" } = await searchParams;
  const supabase = await createClient();

  // ─ Fetch community ─
  const { data: community } = await supabase
    .from("communities")
    .select("id, slug, name, avatar_url, cover_image, member_count, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  // ─ Auth + membership ─
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/signin?redirect=/communities/${slug}/workspace`);
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type, space_access")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    redirect(`/communities/${slug}`);
  }

  const isOwner = community.owner_id === user.id;
  const isAdmin = isOwner || membership.role === "admin" || membership.role === "moderator";

  // ─ Parallel data fetches ─
  const [profileRes, pointsRes, spacesRes, roomsRes, notificationsRes, missionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("member_points")
      .select("total_points, level, streak_days")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("spaces")
      .select("id, name, slug, icon, access_type, sort_order")
      .eq("community_id", community.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("rooms")
      .select("id, name, slug, room_type, space_id, is_locked, access_type, sort_order")
      .eq("community_id", community.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
    supabase
      .from("ugc_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);

  // ─ Build spaces with rooms ─
  const roomsBySpace = new Map<string, NonNullable<typeof roomsRes.data>>();
  for (const r of roomsRes.data ?? []) {
    const list = roomsBySpace.get(r.space_id) ?? [];
    list.push(r);
    roomsBySpace.set(r.space_id, list);
  }

  const spacesWithRooms: WorkspaceSpaceRow[] = (spacesRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    icon: s.icon,
    access_type: s.access_type ?? "free",
    sort_order: s.sort_order,
    rooms: (roomsBySpace.get(s.id) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      room_type: r.room_type,
      space_id: r.space_id,
      is_locked: r.is_locked ?? false,
      access_type: r.access_type ?? "inherit",
      sort_order: r.sort_order,
    })),
  }));

  // ─ Build points snapshot ─
  const LEVEL_THRESHOLDS = [0, 500, 2000, 8000, 25000, 100000];
  const points: PointsSnapshot | null = pointsRes.data
    ? {
        total_points: pointsRes.data.total_points ?? 0,
        level: pointsRes.data.level ?? 1,
        level_start_xp: LEVEL_THRESHOLDS[(pointsRes.data.level ?? 1) - 1] ?? 0,
        next_level_xp:
          LEVEL_THRESHOLDS[pointsRes.data.level ?? 1] ??
          (LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + 100000),
        streak_days: pointsRes.data.streak_days ?? 0,
      }
    : null;

  return (
    <WorkspaceShell
      community={community}
      currentUserId={user.id}
      role={membership.role}
      isAdmin={isAdmin}
      isOwner={isOwner}
      initialSection={section as WorkspaceSection}
      initialView={view === "admin" && isAdmin ? "admin" : "member"}
      profile={profileRes.data}
      points={points}
      spacesWithRooms={spacesWithRooms}
      unreadNotifications={notificationsRes.count ?? 0}
      openMissionsCount={missionsRes.count ?? 0}
      membership={membership}
    >
      {children}
    </WorkspaceShell>
  );
}