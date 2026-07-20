import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSpaceRooms } from "@/services/communityService";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  const { data: space, error } = await admin
    .from("spaces")
    .select("community_id")
    .eq("id", spaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  try {
    const rooms = await getSpaceRooms(spaceId, space.community_id, user?.id);
    return NextResponse.json({ rooms });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Create a room in a space — owner/admin only. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> }
) {
  const { spaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const roomType =
    typeof body.room_type === "string" && body.room_type.trim()
      ? body.room_type.trim()
      : "chat";

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const { data: space } = await supabase
    .from("spaces")
    .select("id, community_id")
    .eq("id", spaceId)
    .eq("is_active", true)
    .maybeSingle();

  if (!space) return NextResponse.json({ error: "Space not found" }, { status: 404 });

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id")
    .eq("id", space.community_id)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const isOwner = community.owner_id === user.id;
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("role")
      .eq("community_id", space.community_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const role = membership?.role;
    if (role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { count } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId);

  const baseSlug = slugify(name) || "room";
  const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      space_id: spaceId,
      community_id: space.community_id,
      name,
      slug,
      room_type: roomType,
      access_type: "inherit",
      sort_order: count ?? 0,
      is_active: true,
    })
    .select("id, name, slug, room_type, space_id, is_locked, access_type, sort_order")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase
    .from("spaces")
    .update({ room_count: (count ?? 0) + 1 })
    .eq("id", spaceId);

  return NextResponse.json({ room });
}
