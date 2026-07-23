import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_GROUP_ICON,
  SPACE_SELECT,
  isSystemGroupSlug,
  asSpaceRow,
  mapSpaceToOwnerGroup,
  resolveGroupManageContext,
  slugifyGroupName,
  type OwnerGroupAction,
} from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

const ACTIONS: OwnerGroupAction[] = [
  "archive",
  "restore",
  "feature",
  "unfeature",
  "pin",
  "unpin",
  "hide",
  "unhide",
  "lock",
  "unlock",
  "duplicate",
  "delete",
];

export async function POST(
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

  const body = (await req.json()) as { action?: string; hard?: boolean };
  const action = body.action as OwnerGroupAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select(SPACE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const row = asSpaceRow(space);
  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    row.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (
    (action === "delete" || action === "archive") &&
    isSystemGroupSlug(row.slug)
  ) {
    return NextResponse.json(
      { error: "System groups cannot be archived or deleted" },
      { status: 400 }
    );
  }

  if (action === "duplicate") {
    const { count } = await admin
      .from("spaces")
      .select("id", { count: "exact", head: true })
      .eq("community_id", row.community_id);

    const base = slugifyGroupName(`${row.name} copy`) || "group-copy";
    const slug = `${base}-${Date.now().toString(36)}`.slice(0, 80);
    const { data: copy, error } = await admin
      .from("spaces")
      .insert({
        community_id: row.community_id,
        name: `${row.name} (copy)`,
        slug,
        description: row.description,
        icon: row.icon ?? DEFAULT_GROUP_ICON,
        color: row.color,
        cover_url: row.cover_url ?? null,
        banner_url: row.banner_url ?? null,
        privacy: row.privacy ?? "public",
        access_type: row.access_type ?? "free",
        is_featured: false,
        is_pinned: false,
        is_hidden: row.is_hidden ?? false,
        is_locked: false,
        welcome_message: row.welcome_message ?? null,
        rules: row.rules ?? null,
        permission_config: row.permission_config ?? {},
        default_content: row.default_content ?? {},
        sort_order: count ?? 0,
        is_active: true,
        room_count: 0,
        member_count: 0,
        last_activity_at: new Date().toISOString(),
      })
      .select(SPACE_SELECT)
      .single();

    if (error || !copy) {
      return NextResponse.json(
        { error: error?.message ?? "Duplicate failed" },
        { status: 400 }
      );
    }

    let duplicated = asSpaceRow(copy);

    const { data: rooms } = await admin
      .from("rooms")
      .select("name, room_type, access_type, sort_order")
      .eq("space_id", row.id)
      .eq("is_active", true)
      .order("sort_order");

    let roomCount = 0;
    for (const room of rooms ?? []) {
      const roomSlug =
        `${slugifyGroupName(room.name) || "channel"}-${roomCount}`.slice(0, 60);
      const { error: roomErr } = await admin.from("rooms").insert({
        space_id: duplicated.id,
        community_id: row.community_id,
        name: room.name,
        slug: roomSlug,
        room_type: room.room_type,
        access_type: room.access_type ?? "inherit",
        sort_order: room.sort_order ?? roomCount,
        is_active: true,
      });
      if (!roomErr) roomCount += 1;
    }
    if (roomCount > 0) {
      await admin
        .from("spaces")
        .update({ room_count: roomCount })
        .eq("id", duplicated.id);
      duplicated = { ...duplicated, room_count: roomCount };
    }

    return NextResponse.json({
      group: mapSpaceToOwnerGroup(duplicated, []),
      action,
    });
  }

  if (action === "delete") {
    if (body.hard) {
      const { error } = await admin.from("spaces").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ ok: true, deleted: true, action });
    }
    const { data: updated, error } = await admin
      .from("spaces")
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(SPACE_SELECT)
      .single();
    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Delete failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      group: mapSpaceToOwnerGroup(asSpaceRow(updated), []),
      action,
    });
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  };

  switch (action) {
    case "archive":
      patch.is_active = false;
      patch.archived_at = new Date().toISOString();
      break;
    case "restore":
      patch.is_active = true;
      patch.archived_at = null;
      break;
    case "feature":
      patch.is_featured = true;
      break;
    case "unfeature":
      patch.is_featured = false;
      break;
    case "pin":
      patch.is_pinned = true;
      break;
    case "unpin":
      patch.is_pinned = false;
      break;
    case "hide":
      patch.is_hidden = true;
      patch.privacy = "hidden";
      break;
    case "unhide":
      patch.is_hidden = false;
      if (row.privacy === "hidden") patch.privacy = "private";
      break;
    case "lock":
      patch.is_locked = true;
      break;
    case "unlock":
      patch.is_locked = false;
      break;
    default:
      break;
  }

  const { data: updated, error } = await admin
    .from("spaces")
    .update(patch)
    .eq("id", id)
    .select(SPACE_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Action failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    group: mapSpaceToOwnerGroup(asSpaceRow(updated), []),
    action,
  });
}
