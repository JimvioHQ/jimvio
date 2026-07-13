import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceProvider } from "@/components/community/workspace-context";
import { WorkspaceRoomView } from "@/components/community/workspace-room-view";

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ room?: string }>;
}) {
  const { slug } = await params;
  const { room: roomId } = await searchParams;
  const supabase = await createClient();

  if (!roomId) return <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">No room specified.</div>;

  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, avatar_url, cover_image, owner_id, member_count")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!community) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // Find the room across all spaces
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

  const roomsBySpace = new Map<string, typeof rooms>();
  for (const r of rooms ?? []) {
    const list = roomsBySpace.get(r.space_id) ?? [];
    list.push(r);
    roomsBySpace.set(r.space_id, list);
  }

  const spacesWithRooms = (spaces ?? []).map((s) => ({
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

  // Resolve room across all spaces
  let resolvedSpace: (typeof spacesWithRooms)[number] | null = null;
  let resolvedRoom: (typeof spacesWithRooms[number]["rooms"])[number] | null = null;
  for (const s of spacesWithRooms) {
    const r = s.rooms.find((x) => x.id === roomId);
    if (r) { resolvedSpace = s; resolvedRoom = r; break; }
  }

  if (!resolvedRoom) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium text-[var(--color-text-primary)]">Room not found</p>
        <p className="text-xs text-[var(--color-text-muted)]">It may have been removed or moved.</p>
      </div>
    );
  }

  // Build minimal workspace context
  const ctx = {
    slug: community.slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count ?? 0,
    avatarUrl: community.avatar_url,
    coverImage: community.cover_image,
    userId: user?.id ?? "",
    currentUserId: user?.id ?? "",
    view: "member" as const,
    isAdmin: false,
    isOwner: false,
    profile: null,
    membership: null,
    spacesWithRooms,
    points: null,
    overview: null,
  };

  return (
    <WorkspaceProvider value={ctx}>
      <WorkspaceRoomView />
    </WorkspaceProvider>
  );
}
