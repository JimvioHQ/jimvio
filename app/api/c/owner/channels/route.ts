import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  CHANNEL_KIND_TO_ROOM_TYPE,
  CHANNEL_TEMPLATES,
  CHANNEL_VISIBILITY_VALUES,
  DEFAULT_AUTOMATION_CONFIG,
  DEFAULT_BEHAVIOR_CONFIG,
  DEFAULT_CHANNEL_COLOR,
  DEFAULT_CHANNEL_ICON,
  permissionConfigForTemplate,
  OWNER_CHANNEL_KINDS,
  ROOM_SELECT,
  asRoomRow,
  asRoomRows,
  mapRoomToOwnerChannel,
  normalizeAutomationConfig,
  normalizeBehaviorConfig,
  normalizePermissionConfig,
  resolveChannelManageContext,
  slugifyChannelName,
  visibilityWriteFields,
  type CreateOwnerChannelInput,
  type ChannelVisibilityMode,
  type OwnerChannelKind,
  type OwnerChannelStaffMember,
} from "@/lib/community/owner-console/channels";

export const dynamic = "force-dynamic";

async function loadStaffMap(
  admin: ReturnType<typeof createServiceRoleClient>,
  roomIds: string[]
): Promise<Map<string, OwnerChannelStaffMember[]>> {
  const map = new Map<string, OwnerChannelStaffMember[]>();
  if (roomIds.length === 0) return map;
  const { data } = await admin
    .from("room_staff")
    .select(
      "room_id, user_id, staff_role, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .in("room_id", roomIds);

  for (const row of data ?? []) {
    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const list = map.get(row.room_id) ?? [];
    list.push({
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      staffRole:
        row.staff_role === "admin"
          ? "admin"
          : row.staff_role === "publisher"
            ? "publisher"
            : "moderator",
      createdAt: row.created_at,
    });
    map.set(row.room_id, list);
  }
  return map;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const ctx = await resolveChannelManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const includeArchived =
    req.nextUrl.searchParams.get("includeArchived") === "1" ||
    req.nextUrl.searchParams.get("includeArchived") === "true";
  const groupId = req.nextUrl.searchParams.get("groupId")?.trim() ?? "";

  const admin = createServiceRoleClient();
  let query = admin
    .from("rooms")
    .select(ROOM_SELECT)
    .eq("community_id", communityId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!includeArchived) query = query.eq("is_active", true);
  if (groupId) query = query.eq("space_id", groupId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = asRoomRows(data);
  const staffMap = await loadStaffMap(
    admin,
    rows.map((r) => r.id)
  );

  const { data: spaces } = await admin
    .from("spaces")
    .select("id, name, slug")
    .eq("community_id", communityId)
    .eq("is_active", true)
    .order("sort_order");

  return NextResponse.json({
    channels: rows.map((r) =>
      mapRoomToOwnerChannel(r, staffMap.get(r.id) ?? [])
    ),
    groups: spaces ?? [],
    templates: CHANNEL_TEMPLATES,
    community: ctx,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateOwnerChannelInput;
  const communityId =
    typeof body.communityId === "string" ? body.communityId.trim() : "";
  const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!communityId || !groupId) {
    return NextResponse.json(
      { error: "communityId and groupId are required" },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const ctx = await resolveChannelManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let kind: OwnerChannelKind =
    body.kind && (OWNER_CHANNEL_KINDS as readonly string[]).includes(body.kind)
      ? body.kind
      : "discussion";

  if (body.templateId) {
    const tpl = CHANNEL_TEMPLATES.find((t) => t.id === body.templateId);
    if (tpl) kind = tpl.kind;
  }

  const visibility: ChannelVisibilityMode =
    body.visibility &&
    (CHANNEL_VISIBILITY_VALUES as readonly string[]).includes(body.visibility)
      ? body.visibility
      : "members";

  const templateId =
    body.templateId &&
    CHANNEL_TEMPLATES.some((t) => t.id === body.templateId)
      ? (body.templateId as (typeof CHANNEL_TEMPLATES)[number]["id"])
      : undefined;

  const permissionConfig = normalizePermissionConfig({
    ...permissionConfigForTemplate(templateId),
    ...body.permissionConfig,
  });
  const behaviorConfig = normalizeBehaviorConfig({
    ...DEFAULT_BEHAVIOR_CONFIG,
    ...body.behaviorConfig,
  });
  const automationConfig = normalizeAutomationConfig({
    ...DEFAULT_AUTOMATION_CONFIG,
    ...body.automationConfig,
  });

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select("id, community_id, room_count")
    .eq("id", groupId)
    .eq("community_id", communityId)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { count } = await admin
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("space_id", groupId);

  const baseSlug =
    (typeof body.slug === "string" && body.slug.trim()
      ? slugifyChannelName(body.slug.trim())
      : slugifyChannelName(name)) || "channel";
  const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);
  const publish = body.publish !== false;
  const icon =
    typeof body.icon === "string" && body.icon.trim()
      ? body.icon.trim()
      : typeof body.emoji === "string" && body.emoji.trim()
        ? body.emoji.trim()
        : DEFAULT_CHANNEL_ICON;
  const emoji =
    typeof body.emoji === "string" && body.emoji.trim()
      ? body.emoji.trim()
      : icon;

  const { data: room, error } = await admin
    .from("rooms")
    .insert({
      space_id: groupId,
      community_id: communityId,
      name,
      slug,
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      icon,
      emoji,
      color:
        typeof body.color === "string" && body.color.trim()
          ? body.color.trim()
          : DEFAULT_CHANNEL_COLOR,
      room_type: CHANNEL_KIND_TO_ROOM_TYPE[kind],
      channel_kind: kind,
      ...visibilityWriteFields(visibility),
      sort_order: count ?? 0,
      is_active: publish,
      archived_at: publish ? null : new Date().toISOString(),
      welcome_message: behaviorConfig.welcomeMessage || null,
      permission_config: permissionConfig,
      behavior_config: behaviorConfig,
      automation_config: automationConfig,
      tags: Array.isArray(body.tags) ? body.tags : [],
      last_activity_at: new Date().toISOString(),
      message_count: 0,
      member_count: 0,
      pinned_count: 0,
      is_locked: behaviorConfig.readOnly,
    })
    .select(ROOM_SELECT)
    .single();

  if (error || !room) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create channel" },
      { status: 400 }
    );
  }

  await admin
    .from("spaces")
    .update({ room_count: (space.room_count ?? 0) + 1 })
    .eq("id", groupId);

  return NextResponse.json({
    channel: mapRoomToOwnerChannel(asRoomRow(room), []),
  });
}
