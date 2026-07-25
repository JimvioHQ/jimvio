import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getSpaceRooms } from "@/services/communityService";
import {
  DEFAULT_BEHAVIOR_CONFIG,
  DEFAULT_PERMISSION_CONFIG,
  DISCUSSION_PERMISSION_CONFIG,
} from "@/lib/community/owner-console/channels";

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

/**
 * Create a room in a space.
 * - Normal create: owner/admin only.
 * - ensure_discussion: any active member may get-or-create the Group Discussion chat
 *   so empty Groups can open chat immediately (no schema change).
 */
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
  const ensureDiscussion = body.ensure_discussion === true;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const roomType =
    typeof body.room_type === "string" && body.room_type.trim()
      ? body.room_type.trim()
      : "chat";

  if (!ensureDiscussion && !name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

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
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role, status")
    .eq("community_id", space.community_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const isActiveMember =
    isOwner ||
    (membership?.status === "active" && Boolean(membership.role));
  const isStaff =
    isOwner ||
    membership?.role === "admin" ||
    membership?.role === "owner";

  if (ensureDiscussion) {
    if (!isActiveMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: existing } = await supabase
      .from("rooms")
      .select(
        "id, name, slug, room_type, space_id, is_locked, access_type, sort_order, is_active"
      )
      .eq("space_id", spaceId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true, nullsFirst: false });

    const rooms = existing ?? [];
    const preferred =
      rooms.find(
        (r) =>
          r.room_type === "chat" &&
          /^(discussion|general|chat|lounge)$/i.test(r.slug ?? "")
      ) ??
      rooms.find(
        (r) =>
          r.room_type === "chat" &&
          /^(discussion|general|chat|general chat)$/i.test(r.name ?? "")
      );

    if (preferred) {
      // Heal legacy Discussion rooms that still have broadcast-only posting modes.
      const { data: healed } = await supabase
        .from("rooms")
        .update({
          permission_config: {
            ...DISCUSSION_PERMISSION_CONFIG,
            publisherIds: [],
          },
          channel_kind: "discussion",
        })
        .eq("id", preferred.id)
        .select(
          "id, name, slug, room_type, space_id, is_locked, access_type, sort_order, is_active"
        )
        .maybeSingle();
      return NextResponse.json({ room: healed ?? preferred, ensured: false });
    }

    // Fall through to create Discussion for any active member.
  } else if (!isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const roomName = ensureDiscussion ? "Discussion" : name;
  const finalRoomType = ensureDiscussion ? "chat" : roomType;
  // Only Group Discussion is member-writable. Every Channel is broadcast-first.
  const isOpenChat = ensureDiscussion;
  const channelKind =
    ensureDiscussion
      ? "discussion"
      : finalRoomType === "posts"
        ? "announcement"
        : finalRoomType === "resources"
          ? "resources"
          : finalRoomType === "voice"
            ? "voice"
            : finalRoomType === "live"
              ? "live"
              : finalRoomType === "tasks"
                ? "events"
                : finalRoomType === "course"
                  ? "courses"
                  : "announcement";
  const permissionConfig = isOpenChat
    ? { ...DISCUSSION_PERMISSION_CONFIG, publisherIds: [] }
    : {
        ...DEFAULT_PERMISSION_CONFIG,
        whoCanPost: [...DEFAULT_PERMISSION_CONFIG.whoCanPost],
        publisherIds: [],
      };

  const { count } = await supabase
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId);

  const baseSlug = slugify(roomName) || (ensureDiscussion ? "discussion" : "room");
  const slug = ensureDiscussion
    ? "discussion"
    : `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);

  // Idempotent discussion slug — if a race created it, return existing.
  if (ensureDiscussion) {
    const { data: raced } = await supabase
      .from("rooms")
      .select(
        "id, name, slug, room_type, space_id, is_locked, access_type, sort_order, is_active"
      )
      .eq("space_id", spaceId)
      .eq("slug", "discussion")
      .eq("is_active", true)
      .maybeSingle();
    if (raced) {
      return NextResponse.json({ room: raced, ensured: false });
    }
  }

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      space_id: spaceId,
      community_id: space.community_id,
      name: roomName,
      slug,
      room_type: finalRoomType,
      access_type: "inherit",
      sort_order: count ?? 0,
      is_active: true,
      channel_kind: channelKind,
      permission_config: permissionConfig,
      behavior_config: {
        ...DEFAULT_BEHAVIOR_CONFIG,
        welcomeMessage: ensureDiscussion
          ? "Welcome to this Group. Start the first conversation."
          : finalRoomType === "posts"
            ? "Publish your first announcement."
            : "Welcome to the channel.",
        defaultTabs: ensureDiscussion ? ["discussion"] : DEFAULT_BEHAVIOR_CONFIG.defaultTabs,
      },
    })
    .select("id, name, slug, room_type, space_id, is_locked, access_type, sort_order")
    .single();

  if (error) {
    if (ensureDiscussion && /duplicate|unique/i.test(error.message)) {
      const { data: raced } = await supabase
        .from("rooms")
        .select(
          "id, name, slug, room_type, space_id, is_locked, access_type, sort_order, is_active"
        )
        .eq("space_id", spaceId)
        .eq("slug", "discussion")
        .maybeSingle();
      if (raced) return NextResponse.json({ room: raced, ensured: false });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase
    .from("spaces")
    .update({ room_count: (count ?? 0) + 1 })
    .eq("id", spaceId);

  return NextResponse.json({ room, ensured: ensureDiscussion ? true : undefined });
}
