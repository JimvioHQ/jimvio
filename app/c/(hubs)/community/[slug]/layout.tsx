
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// import { WorkspaceShell } from "@/components/community/workspace/WorkspaceShell";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import { WorkspaceLayout } from "@/components/community/workspace/WorkspaceShell";
import { buildPointsSnapshot } from "@/lib/community/points";
import { getCommunityOverviewStats } from "@/services/community/hub-data";

export default async function CommunityWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase

    .from("communities")
    .select("id, slug, name, avatar_url, member_count, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  // ─ Auth + membership ─
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/signin?redirect=/c/${slug}/workspace`);

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status, plan_type, space_access")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    redirect(`/c/${slug}`);
  }

  const isOwner = community.owner_id === user.id;
  const isAdmin = isOwner || membership.role === "admin" || membership.role === "moderator";

  // ─ Parallel data fetches ─
  const [profileRes, pointsRes, spacesRes, roomsRes, overview] = await Promise.all([
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
    getCommunityOverviewStats(community.id, user.id),
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
  const points: PointsSnapshot | null = pointsRes.data
    ? buildPointsSnapshot(
        pointsRes.data.total_points ?? 0,
        pointsRes.data.level ?? 1,
        pointsRes.data.streak_days ?? 0
      )
    : null;

  return (
    <WorkspaceLayout
      community={community as any}
      currentUserId={user.id}
      role={membership.role as any}
      isAdmin={isAdmin}
      isOwner={isOwner}
      initialView="member"
      profile={profileRes.data}
      points={points}
      spacesWithRooms={spacesWithRooms}
      membership={membership as any}
      overview={overview}
    >
      {children}
    </WorkspaceLayout>
  );
}