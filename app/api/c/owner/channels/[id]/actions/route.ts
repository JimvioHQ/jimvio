import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  DEFAULT_CHANNEL_ICON,
  ROOM_SELECT,
  asRoomRow,
  mapRoomToOwnerChannel,
  resolveChannelManageContext,
  slugifyChannelName,
  type OwnerChannelAction,
} from "@/lib/community/owner-console/channels";

export const dynamic = "force-dynamic";

const ACTIONS: OwnerChannelAction[] = [
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
  "clone",
  "delete",
  "move",
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

  const body = (await req.json()) as {
    action?: string;
    hard?: boolean;
    targetGroupId?: string;
  };
  const action = body.action as OwnerChannelAction | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data: roomData } = await admin
    .from("rooms")
    .select(ROOM_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!roomData) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }
  const row = asRoomRow(roomData);

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    row.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  if (action === "move") {
    const targetGroupId =
      typeof body.targetGroupId === "string" ? body.targetGroupId.trim() : "";
    if (!targetGroupId) {
      return NextResponse.json(
        { error: "targetGroupId is required" },
        { status: 400 }
      );
    }
    const { data: space } = await admin
      .from("spaces")
      .select("id")
      .eq("id", targetGroupId)
      .eq("community_id", row.community_id)
      .maybeSingle();
    if (!space) {
      return NextResponse.json({ error: "Target group not found" }, { status: 404 });
    }
    const oldSpace = row.space_id;
    const { data: updated, error } = await admin
      .from("rooms")
      .update({
        space_id: targetGroupId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(ROOM_SELECT)
      .single();
    if (error || !updated) {
      return NextResponse.json(
        { error: error?.message ?? "Move failed" },
        { status: 400 }
      );
    }
    for (const sid of [oldSpace, targetGroupId]) {
      const { count } = await admin
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("space_id", sid)
        .eq("is_active", true);
      await admin.from("spaces").update({ room_count: count ?? 0 }).eq("id", sid);
    }
    return NextResponse.json({
      channel: mapRoomToOwnerChannel(asRoomRow(updated), []),
      action,
    });
  }

  if (action === "duplicate" || action === "clone") {
    const { count } = await admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("space_id", row.space_id);
    const base = slugifyChannelName(`${row.name} copy`) || "channel-copy";
    const slug = `${base}-${Date.now().toString(36)}`.slice(0, 80);
    const { data: copy, error } = await admin
      .from("rooms")
      .insert({
        space_id: row.space_id,
        community_id: row.community_id,
        name: `${row.name} (copy)`,
        slug,
        description: row.description,
        icon: row.icon ?? DEFAULT_CHANNEL_ICON,
        emoji: row.emoji ?? row.icon,
        color: row.color,
        room_type: row.room_type,
        channel_kind: row.channel_kind,
        access_type: row.access_type,
        visibility: row.visibility ?? "members",
        is_featured: false,
        is_pinned: false,
        is_hidden: row.is_hidden ?? false,
        is_locked: false,
        welcome_message: row.welcome_message,
        permission_config: row.permission_config ?? {},
        behavior_config: row.behavior_config ?? {},
        automation_config: row.automation_config ?? {},
        tags: row.tags ?? [],
        sort_order: count ?? 0,
        is_active: true,
        message_count: 0,
        member_count: 0,
        pinned_count: 0,
        last_activity_at: new Date().toISOString(),
      })
      .select(ROOM_SELECT)
      .single();
    if (error || !copy) {
      return NextResponse.json(
        { error: error?.message ?? "Duplicate failed" },
        { status: 400 }
      );
    }
    await admin
      .from("spaces")
      .update({ room_count: (count ?? 0) + 1 })
      .eq("id", row.space_id);
    return NextResponse.json({
      channel: mapRoomToOwnerChannel(asRoomRow(copy), []),
      action,
    });
  }

  if (action === "delete") {
    if (body.hard) {
      const { error } = await admin.from("rooms").delete().eq("id", id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      const { count } = await admin
        .from("rooms")
        .select("id", { count: "exact", head: true })
        .eq("space_id", row.space_id)
        .eq("is_active", true);
      await admin
        .from("spaces")
        .update({ room_count: count ?? 0 })
        .eq("id", row.space_id);
      return NextResponse.json({ ok: true, deleted: true, action });
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
        { error: error?.message ?? "Delete failed" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      channel: mapRoomToOwnerChannel(asRoomRow(updated), []),
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
      patch.visibility = "hidden";
      break;
    case "unhide":
      patch.is_hidden = false;
      if (row.visibility === "hidden") patch.visibility = "members";
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
    .from("rooms")
    .update(patch)
    .eq("id", id)
    .select(ROOM_SELECT)
    .single();

  if (error || !updated) {
    return NextResponse.json(
      { error: error?.message ?? "Action failed" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    channel: mapRoomToOwnerChannel(asRoomRow(updated), []),
    action,
  });
}
