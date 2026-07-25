import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubSpaces } from "@/services/community/hub-data";
import {
  isSpaceType,
  SPACE_TYPE_LABELS,
  SPACE_TYPE_TO_ROOM_TYPE,
  type SpaceType,
} from "@/lib/community/workspace/space-types";

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

/** Create a Space with a primary room matching the Space type. */
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

  const rawSpaceType = body.spaceType ?? body.space_type;
  let spaceType: SpaceType = "discussion";
  if (rawSpaceType !== undefined && rawSpaceType !== null && rawSpaceType !== "") {
    if (!isSpaceType(rawSpaceType)) {
      return NextResponse.json(
        { error: "Invalid spaceType" },
        { status: 400 }
      );
    }
    spaceType = rawSpaceType;
  }

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
      space_type: spaceType,
      sort_order: count ?? 0,
      is_active: true,
      room_count: 0,
    })
    .select(
      "id, name, slug, description, access_type, space_type, sort_order, community_id"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const roomType = SPACE_TYPE_TO_ROOM_TYPE[spaceType] ?? "chat";
  const roomName = SPACE_TYPE_LABELS[spaceType] ?? "Discussion";
  const roomSlug = `${slugify(roomName) || "room"}-${Date.now().toString(36)}`.slice(
    0,
    80
  );

  const channelKindBySpaceType: Record<SpaceType, string> = {
    discussion: "discussion",
    voice: "voice",
    live: "live",
    course: "courses",
    marketplace: "marketplace",
    event: "events",
    ai: "ai",
  };

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .insert({
      space_id: space.id,
      community_id: communityId,
      name: roomName,
      slug: roomSlug,
      room_type: roomType,
      access_type: "inherit",
      sort_order: 0,
      is_active: true,
      channel_kind: channelKindBySpaceType[spaceType],
    })
    .select(
      "id, name, slug, room_type, space_id, community_id, access_type, sort_order, channel_kind"
    )
    .single();

  if (roomError) {
    await supabase.from("spaces").delete().eq("id", space.id);
    return NextResponse.json({ error: roomError.message }, { status: 400 });
  }

  await supabase
    .from("spaces")
    .update({ room_count: 1 })
    .eq("id", space.id);

  return NextResponse.json({
    space: { ...space, room_count: 1 },
    room,
  });
}
