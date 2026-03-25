import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/community/workspace-shell";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";

export default async function CommunityWorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/communities/${slug}/workspace`)}`);
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, avatar_url, member_count, owner_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, plan_type, status, space_access")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    redirect(`/communities/${slug}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, username")
    .eq("id", user.id)
    .maybeSingle();

  const { data: pointsRow } = await supabase
    .from("member_points")
    .select("total_points, level")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: spaces } = await supabase
    .from("spaces")
    .select("id, name, slug, icon, access_type, sort_order")
    .eq("community_id", community.id)
    .eq("is_active", true)
    .order("sort_order");

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, slug, room_type, space_id, is_locked, access_type, sort_order")
    .eq("community_id", community.id)
    .eq("is_active", true)
    .order("sort_order");

  const roomsBySpace = new Map<string, NonNullable<typeof rooms>>();
  for (const r of rooms ?? []) {
    const list = roomsBySpace.get(r.space_id) ?? [];
    list.push(r);
    roomsBySpace.set(r.space_id, list);
  }

  const spacesWithRooms: WorkspaceSpaceRow[] = (spaces ?? []).map((s) => ({
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

  return (
    <WorkspaceShell
      slug={slug}
      community={community}
      membership={membership}
      userId={user.id}
      profile={profile}
      points={pointsRow}
      spacesWithRooms={spacesWithRooms}
    >
      {children}
    </WorkspaceShell>
  );
}
