import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

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

  const payload = (await req.json()) as { body?: string; delete?: boolean };

  if (payload.delete === true) {
    const isAuthor = row.sender_id === user.id;

    // Check if user is staff (moderator/admin/owner)
    let isStaff = false;
    if (!isAuthor) {
      const { data: staff } = await supabase
        .from("community_memberships")
        .select("role")
        .eq("community_id", row.community_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      isStaff = staff?.role === "owner" || staff?.role === "admin" || staff?.role === "moderator";
    }

    if (!isAuthor && !isStaff) {
      return NextResponse.json({ error: "Only sender or moderators can delete messages" }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("community_messages")
      .update({ is_deleted: true, body: "", deleted_by: isStaff && !isAuthor ? user.id : null })
      .eq("id", messageId)
      .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ message: data });
  }

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
    .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
