import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** Untyped access for columns added in migration 085 before generated types catch up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

const SELECT_WITH_PROFILE =
  "*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)";

async function getStaffRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data?.role ?? null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; messageId: string }> }
) {
  const { roomId, messageId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: row, error: fetchErr } = await supabase
    .from("community_messages")
    .select("id, sender_id, room_id, thread_id, community_id")
    .eq("id", messageId)
    .single();

  if (fetchErr || !row || row.room_id !== roomId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const payload = (await req.json()) as {
    body?: string;
    delete?: boolean;
    pin?: boolean;
  };

  // ── Pin / unpin (staff only) ────────────────────────────────────────────
  if (typeof payload.pin === "boolean") {
    const role = await getStaffRole(supabase, row.community_id, user.id);
    if (!role || !["owner", "admin", "moderator"].includes(role)) {
      return NextResponse.json(
        { error: "Only moderators can pin messages" },
        { status: 403 }
      );
    }

    const { data, error } = await untyped(supabase)
      .from("community_messages")
      .update({
        is_pinned: payload.pin,
        pinned_by: payload.pin ? user.id : null,
        pinned_at: payload.pin ? new Date().toISOString() : null,
      })
      .eq("id", messageId)
      .select(SELECT_WITH_PROFILE)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: data });
  }

  // ── Soft delete ──────────────────────────────────────────────────────────
  if (payload.delete === true) {
    const isAuthor = row.sender_id === user.id;

    let isStaff = false;
    if (!isAuthor) {
      const role = await getStaffRole(supabase, row.community_id, user.id);
      isStaff = role === "owner" || role === "admin" || role === "moderator";
    }

    if (!isAuthor && !isStaff) {
      return NextResponse.json({ error: "Only sender or moderators can delete messages" }, { status: 403 });
    }

    // Preference: soft-delete so history/threads/reactions stay consistent.
    // `is_deleted` is treated as the source of truth everywhere it's read.
    const { data, error } = await untyped(supabase)
      .from("community_messages")
      .update({
        is_deleted: true,
        deleted_by: user.id,
        deleted_at: new Date().toISOString(),
        body: "",
      })
      .eq("id", messageId)
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: data });
  }

  // ── Edit body ────────────────────────────────────────────────────────────
  if (row.sender_id !== user.id) {
    return NextResponse.json({ error: "Only your messages can be edited" }, { status: 403 });
  }

  if (typeof payload.body !== "string") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const trimmed = payload.body.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("community_messages")
    .update({
      body: trimmed,
      is_edited: true,
      edited_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select(SELECT_WITH_PROFILE)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
