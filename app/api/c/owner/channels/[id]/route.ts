import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CHANNEL_KIND_TO_ROOM_TYPE,
  CHANNEL_VISIBILITY_VALUES,
  OWNER_CHANNEL_KINDS,
  ROOM_SELECT,
  asRoomRow,
  mapRoomToOwnerChannel,
  normalizeAutomationConfig,
  normalizeBehaviorConfig,
  normalizePermissionConfig,
  resolveChannelManageContext,
  slugifyChannelName,
  visibilityWriteFields,
  type ChannelVisibilityMode,
  type OwnerChannelKind,
  type OwnerChannelStaffMember,
  type UpdateOwnerChannelInput,
} from "@/lib/community/owner-console/channels";

export const dynamic = "force-dynamic";

async function loadRoom(
  admin: ReturnType<typeof createServiceRoleClient>,
  id: string
) {
  const { data, error } = await admin
    .from("rooms")
    .select(ROOM_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return asRoomRow(data);
}

async function loadStaff(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomId: string
): Promise<OwnerChannelStaffMember[]> {
  const { data } = await admin
    .from("room_staff")
    .select(
      "user_id, staff_role, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .eq("room_id", roomId);
  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    return {
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      staffRole: (row.staff_role === "admin"
        ? "admin"
        : row.staff_role === "publisher"
          ? "publisher"
          : "moderator") as "admin" | "moderator" | "publisher",
      createdAt: row.created_at,
    };
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const room = await loadRoom(admin, id);
  if (!room) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    room.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const staff = await loadStaff(admin, room.id);
  return NextResponse.json({
    channel: mapRoomToOwnerChannel(room, staff),
    community: ctx,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const room = await loadRoom(admin, id);
  if (!room) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    room.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = (await req.json()) as UpdateOwnerChannelInput;
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  if (typeof body.name === "string" && body.name.trim()) {
    patch.name = body.name.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    patch.slug = slugifyChannelName(body.slug.trim()) || room.slug;
  }
  if (body.description !== undefined) {
    patch.description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null;
  }
  if (body.icon !== undefined) {
    patch.icon =
      typeof body.icon === "string" && body.icon.trim() ? body.icon.trim() : null;
  }
  if (body.emoji !== undefined) {
    patch.emoji =
      typeof body.emoji === "string" && body.emoji.trim()
        ? body.emoji.trim()
        : null;
  }
  if (body.color !== undefined) {
    patch.color =
      typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : null;
  }
  if (
    body.kind &&
    (OWNER_CHANNEL_KINDS as readonly string[]).includes(body.kind)
  ) {
    patch.channel_kind = body.kind as OwnerChannelKind;
    patch.room_type = CHANNEL_KIND_TO_ROOM_TYPE[body.kind as OwnerChannelKind];
  }
  if (typeof body.groupId === "string" && body.groupId.trim()) {
    const { data: space } = await admin
      .from("spaces")
      .select("id")
      .eq("id", body.groupId.trim())
      .eq("community_id", room.community_id)
      .maybeSingle();
    if (!space) {
      return NextResponse.json({ error: "Target group not found" }, { status: 400 });
    }
    patch.space_id = space.id;
  }
  if (
    body.visibility &&
    (CHANNEL_VISIBILITY_VALUES as readonly string[]).includes(body.visibility)
  ) {
    Object.assign(
      patch,
      visibilityWriteFields(body.visibility as ChannelVisibilityMode)
    );
  }
  if (body.welcomeMessage !== undefined) {
    patch.welcome_message =
      typeof body.welcomeMessage === "string" ? body.welcomeMessage : null;
  }
  if (body.permissionConfig) {
    patch.permission_config = normalizePermissionConfig({
      ...normalizePermissionConfig(room.permission_config),
      ...body.permissionConfig,
    });
  }
  if (body.behaviorConfig) {
    const next = normalizeBehaviorConfig({
      ...normalizeBehaviorConfig(room.behavior_config),
      ...body.behaviorConfig,
    });
    patch.behavior_config = next;
    patch.welcome_message = next.welcomeMessage;
    if (typeof body.behaviorConfig.readOnly === "boolean") {
      patch.is_locked = body.behaviorConfig.readOnly;
    }
  }
  if (body.automationConfig) {
    patch.automation_config = normalizeAutomationConfig({
      ...normalizeAutomationConfig(room.automation_config),
      ...body.automationConfig,
    });
  }
  if (Array.isArray(body.tags)) patch.tags = body.tags;
  if (typeof body.isFeatured === "boolean") patch.is_featured = body.isFeatured;
  if (typeof body.isPinned === "boolean") patch.is_pinned = body.isPinned;
  if (typeof body.isHidden === "boolean") {
    patch.is_hidden = body.isHidden;
    if (body.isHidden) patch.visibility = "hidden";
  }
  if (typeof body.isLocked === "boolean") patch.is_locked = body.isLocked;
  if (typeof body.sortOrder === "number") patch.sort_order = body.sortOrder;

  const { data: updated, error } = await admin
    .from("rooms")
    .update(patch)
    .eq("id", id)
    .select(ROOM_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Update failed" },
      { status: 400 }
    );
  }

  const staff = await loadStaff(admin, id);
  return NextResponse.json({
    channel: mapRoomToOwnerChannel(asRoomRow(updated), staff),
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const room = await loadRoom(admin, id);
  if (!room) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    room.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const hard = req.nextUrl.searchParams.get("hard") === "1";
  if (hard) {
    const { error } = await admin.from("rooms").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const { count } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("space_id", room.space_id)
      .eq("is_active", true);
    await admin
      .from("spaces")
      .update({ room_count: count ?? 0 })
      .eq("id", room.space_id);
    return NextResponse.json({ ok: true, deleted: true });
  }

  const { data: updated, error } = await admin
    .from("rooms")
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ROOM_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Archive failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    channel: mapRoomToOwnerChannel(asRoomRow(updated), []),
    archived: true,
  });
}
