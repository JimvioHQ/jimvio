import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  const { data, error } = await supabase
    .from("community_messages")
    .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .is("thread_id", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ messages: data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { body, threadId, attachments, message_type } = (await req.json()) as {
    body?: string;
    threadId?: string | null;
    attachments?: unknown;
    message_type?: string;
  };

  const attachmentList = Array.isArray(attachments) ? attachments : [];
  const bodyTrim = typeof body === "string" ? body.trim() : "";
  if (!bodyTrim && attachmentList.length === 0) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  let resolvedType = message_type ?? "text";
  if (attachmentList.length > 0) {
    const mimes = attachmentList.map((a: { mime?: string }) => (typeof a?.mime === "string" ? a.mime : ""));
    const allImages = mimes.length > 0 && mimes.every((m) => m.startsWith("image/"));
    const allAudio = mimes.length > 0 && mimes.every((m) => m.startsWith("audio/"));
    if (bodyTrim) resolvedType = "text";
    else if (allImages) resolvedType = "image";
    else if (allAudio) resolvedType = "audio";
    else resolvedType = "file";
  }

  const { data: room } = await supabase.from("rooms").select("community_id").eq("id", roomId).single();
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("community_messages")
    .insert({
      room_id: roomId,
      community_id: room.community_id,
      sender_id: user.id,
      body: bodyTrim,
      thread_id: threadId || null,
      attachments: attachmentList,
      message_type: resolvedType,
    })
    .select("*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
