import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { pickPrimarySpaceCandidate } from "@/lib/community/workspace/primary-space";
import {
  DEFAULT_GROUP_COLOR,
  DEFAULT_GROUP_CONTENT,
  DEFAULT_GROUP_ICON,
  DEFAULT_PERMISSION_CONFIG,
  GROUP_PRIVACY_VALUES,
  SPACE_SELECT,
  asSpaceRow,
  asSpaceRows,
  mapSpaceToOwnerGroup,
  normalizeDefaultContent,
  normalizePermissionConfig,
  privacyWriteFields,
  resolveGroupManageContext,
  slugifyGroupName,
  type CreateOwnerGroupInput,
  type GroupPrivacyMode,
  type OwnerGroupStaffMember,
} from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

async function loadStaffMap(
  admin: ReturnType<typeof createServiceRoleClient>,
  spaceIds: string[]
): Promise<Map<string, OwnerGroupStaffMember[]>> {
  const map = new Map<string, OwnerGroupStaffMember[]>();
  if (spaceIds.length === 0) return map;

  const { data } = await admin
    .from("space_staff")
    .select(
      "space_id, user_id, staff_role, created_at, profiles:user_id(full_name, username, avatar_url)"
    )
    .in("space_id", spaceIds);

  for (const row of data ?? []) {
    const profile = row.profiles as
      | { full_name: string | null; username: string | null; avatar_url: string | null }
      | { full_name: string | null; username: string | null; avatar_url: string | null }[]
      | null;
    const p = Array.isArray(profile) ? profile[0] : profile;
    const list = map.get(row.space_id) ?? [];
    list.push({
      userId: row.user_id,
      fullName: p?.full_name ?? null,
      username: p?.username ?? null,
      avatarUrl: p?.avatar_url ?? null,
      staffRole: row.staff_role === "admin" ? "admin" : "moderator",
      createdAt: row.created_at,
    });
    map.set(row.space_id, list);
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

  const ctx = await resolveGroupManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const includeArchived =
    req.nextUrl.searchParams.get("includeArchived") === "1" ||
    req.nextUrl.searchParams.get("includeArchived") === "true";
  const includeSystem =
    req.nextUrl.searchParams.get("includeSystem") === "1" ||
    req.nextUrl.searchParams.get("includeSystem") === "true";

  const admin = createServiceRoleClient();
  let query = admin
    .from("spaces")
    .select(SPACE_SELECT)
    .eq("community_id", communityId)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = asSpaceRows(data);
  const activeRows = rows.filter((r) => r.is_active !== false);
  const primary = pickPrimarySpaceCandidate(activeRows) ?? pickPrimarySpaceCandidate(rows);

  const filtered = includeSystem
    ? primary
      ? [primary]
      : []
    : primary && !mapSpaceToOwnerGroup(primary).isSystem
      ? [primary]
      : [];

  const staffMap = await loadStaffMap(
    admin,
    filtered.map((r) => r.id)
  );

  const groups = filtered.map((r) =>
    mapSpaceToOwnerGroup(r, staffMap.get(r.id) ?? [])
  );

  return NextResponse.json({ groups, community: ctx });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as CreateOwnerGroupInput;
  const communityId =
    typeof body.communityId === "string" ? body.communityId.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const ctx = await resolveGroupManageContext(supabase, user.id, communityId);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const privacy: GroupPrivacyMode =
    body.privacy &&
    (GROUP_PRIVACY_VALUES as readonly string[]).includes(body.privacy)
      ? body.privacy
      : "public";

  const permissionConfig = normalizePermissionConfig({
    ...DEFAULT_PERMISSION_CONFIG,
    ...body.permissionConfig,
  });
  const defaultContent = normalizeDefaultContent({
    ...DEFAULT_GROUP_CONTENT,
    ...body.defaultContent,
  });

  const admin = createServiceRoleClient();

  const { count: activeSpaceCount } = await admin
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId)
    .eq("is_active", true);

  if ((activeSpaceCount ?? 0) >= 1) {
    return NextResponse.json(
      { error: "Each community supports one Space. Edit the existing Space instead." },
      { status: 409 }
    );
  }

  const { count } = await admin
    .from("spaces")
    .select("id", { count: "exact", head: true })
    .eq("community_id", communityId);

  const baseSlug =
    (typeof body.slug === "string" && body.slug.trim()
      ? slugifyGroupName(body.slug.trim())
      : slugifyGroupName(name)) || "group";
  const slug = `${baseSlug}-${Date.now().toString(36)}`.slice(0, 80);
  const privacyFields = privacyWriteFields(privacy);
  const publish = body.publish !== false;

  const insertPayload = {
    community_id: communityId,
    name,
    slug,
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : null,
    icon:
      typeof body.icon === "string" && body.icon.trim()
        ? body.icon.trim()
        : DEFAULT_GROUP_ICON,
    color:
      typeof body.color === "string" && body.color.trim()
        ? body.color.trim()
        : DEFAULT_GROUP_COLOR,
    cover_url:
      typeof body.coverUrl === "string" && body.coverUrl.trim()
        ? body.coverUrl.trim()
        : null,
    banner_url:
      typeof body.bannerUrl === "string" && body.bannerUrl.trim()
        ? body.bannerUrl.trim()
        : null,
    ...privacyFields,
    sort_order: count ?? 0,
    is_active: publish,
    archived_at: publish ? null : new Date().toISOString(),
    welcome_message: defaultContent.welcomeMessage || null,
    rules: defaultContent.defaultRules || null,
    permission_config: permissionConfig,
    default_content: defaultContent,
    last_activity_at: new Date().toISOString(),
    member_count: 0,
    room_count: 0,
  };

  const { data: space, error } = await admin
    .from("spaces")
    .insert(insertPayload)
    .select(SPACE_SELECT)
    .single();

  if (error || !space) {
    return NextResponse.json(
      { error: error?.message ?? "Could not create group" },
      { status: 400 }
    );
  }

  let created = asSpaceRow(space);

  // Only create channels when the owner explicitly provided them.
  const channels = defaultContent.defaultChannels.filter(
    (ch) => typeof ch.name === "string" && ch.name.trim().length > 0
  );

  let roomCount = 0;
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const roomSlug =
      `${slugifyGroupName(ch.name) || "channel"}-${i}`.slice(0, 60);
    const { error: roomError } = await admin.from("rooms").insert({
      space_id: created.id,
      community_id: communityId,
      name: ch.name,
      slug: roomSlug,
      room_type: ch.roomType || "chat",
      access_type: "inherit",
      sort_order: i,
      is_active: true,
    });
    if (!roomError) roomCount += 1;
  }

  if (roomCount > 0) {
    await admin
      .from("spaces")
      .update({ room_count: roomCount })
      .eq("id", created.id);
    created = { ...created, room_count: roomCount };
  }

  await admin
    .from("communities")
    .update({
      space_count: (count ?? 0) + 1,
    })
    .eq("id", communityId);

  return NextResponse.json({
    group: mapSpaceToOwnerGroup(created, []),
  });
}
