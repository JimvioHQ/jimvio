import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubSpaces } from "@/services/community/hub-data";

export const dynamic = "force-dynamic";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const spaces = await getHubSpaces(user.id);
  return NextResponse.json({ spaces });
}

/** Create a space (and default room) in a community — owner/admin only. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const communityId = typeof body.communityId === "string" ? body.communityId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" && body.description.trim()
      ? body.description.trim()
      : null;
  const accessType =
    typeof body.access_type === "string" && body.access_type.trim()
      ? body.access_type.trim()
      : "free";
  const defaultRoomType =
    typeof body.defaultRoomType === "string" && body.defaultRoomType.trim()
      ? body.defaultRoomType.trim()
      : "chat";

  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, owner_id")
    .eq("id", communityId)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) {
    return NextResponse.json({ error: "Community not found" }, { status: 404 });
  }

  const isOwner = community.owner_id === user.id;
  if (!isOwner) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("role")
      .eq("community_id", communityId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    const role = membership?.role;
    if (role !== "admin" && role !== "owner") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { count } = await supabase
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  const baseSlug = slugify(name) || "space";
  const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);

  const { data: space, error } = await supabase
    .from("spaces")
    .insert({
      community_id: communityId,
      name,
      slug,
      description,
      access_type: accessType,
      sort_order: count ?? 0,
      is_active: true,
    })
    .select("id, name, slug, description, access_type, sort_order, community_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const roomName =
    defaultRoomType === "posts"
      ? "Announcements"
      : defaultRoomType === "resources"
        ? "Resources"
        : "General";
  const roomSlug = slugify(roomName) || "general";

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      space_id: space.id,
      community_id: communityId,
      name: roomName,
      slug: roomSlug,
      room_type: defaultRoomType,
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
    })
    .select("id, name, slug, room_type, space_id")
    .single();

  if (roomError) {
    // Space already created — return it; room creation is best-effort for UX.
    return NextResponse.json({ space, room: null, warning: roomError.message });
  }

  await supabase
    .from("spaces")
    .update({ room_count: 1 })
    .eq("id", space.id);

  return NextResponse.json({ space, room });
}
