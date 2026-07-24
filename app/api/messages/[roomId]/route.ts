import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";
import { notifyMentionedUsers } from "@/lib/community/notify-community";
import { assertCanPublishInRoom } from "@/lib/community/workspace/assert-can-publish";
import {
  escapeIlikePattern,
  sanitizeChatAttachments,
} from "@/lib/community/chat/sanitize-attachments";

export const dynamic = "force-dynamic";

/** Untyped access for columns added in migration 085 before generated types catch up. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

const SELECT_WITH_PROFILE =
  "*, profiles!community_messages_sender_id_fkey(full_name, avatar_url, username, is_verified)";

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
  const before = searchParams.get("before");
  const q = searchParams.get("q")?.trim();

  let query = untyped(supabase)
    .from("community_messages")
    .select(SELECT_WITH_PROFILE)
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .is("thread_id", null);

  if (before) query = query.lt("created_at", before);
  if (q) query = query.ilike("body", `%${escapeIlikePattern(q)}%`);

  // Newest-first for pagination, reversed below to chronological order.
  const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const messages = ((data ?? []) as { created_at: string }[]).slice().reverse();
  const nextCursor = messages.length === limit ? messages[0]?.created_at ?? null : null;

  return NextResponse.json({ messages, nextCursor });
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

  const publishGate = await assertCanPublishInRoom(supabase, user.id, roomId);
  if (!publishGate.ok) {
    return NextResponse.json(
      { error: publishGate.error },
      { status: publishGate.status }
    );
  }

  const {
    body,
    threadId,
    attachments,
    message_type,
    reply_to_id,
    reply_to_body,
    reply_to_sender,
    metadata,
  } = (await req.json()) as {
    body?: string;
    threadId?: string | null;
    attachments?: unknown;
    message_type?: string;
    reply_to_id?: string | null;
    reply_to_body?: string | null;
    reply_to_sender?: string | null;
    metadata?: Record<string, unknown> | null;
  };

  const sanitized = sanitizeChatAttachments(attachments);
  if (!sanitized.ok) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }
  const attachmentList = sanitized.attachments;
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

  // Metadata is a passthrough bag (link previews, gif hints, etc). Cap its
  // serialized size defensively — this is untrusted client input.
  let safeMetadata: Record<string, unknown> = {};
  if (metadata && typeof metadata === "object") {
    try {
      const serialized = JSON.stringify(metadata);
      if (serialized.length <= 8000) safeMetadata = metadata;
    } catch {
      safeMetadata = {};
    }
  }

  const insertRow: Record<string, unknown> = {
    room_id: roomId,
    community_id: room.community_id,
    sender_id: user.id,
    body: bodyTrim,
    thread_id: threadId || null,
    attachments: attachmentList,
    message_type: resolvedType,
    metadata: safeMetadata,
  };

  // Reply-to snapshot only applies to top-level messages, not thread replies.
  if (!threadId && typeof reply_to_id === "string" && reply_to_id) {
    insertRow.reply_to_id = reply_to_id;
    insertRow.reply_to_body =
      typeof reply_to_body === "string" ? reply_to_body.slice(0, 200) : null;
    insertRow.reply_to_sender =
      typeof reply_to_sender === "string" ? reply_to_sender.slice(0, 120) : null;
  }

  const { data, error } = await untyped(supabase)
    .from("community_messages")
    .insert(insertRow)
    .select(SELECT_WITH_PROFILE)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (bodyTrim) void notifyMentionsInMessage(supabase, room.community_id, roomId, bodyTrim, user.id, data);

  return NextResponse.json({ message: data });
}

async function notifyMentionsInMessage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string,
  roomId: string,
  body: string,
  actorId: string,
  message: { profiles?: { full_name: string | null; username: string | null } | null } | null
): Promise<void> {
  try {
    const { data: community } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", communityId)
      .maybeSingle();
    if (!community?.slug) return;

    const actorProfile = message?.profiles;
    await notifyMentionedUsers(supabase, {
      body,
      communityId,
      communitySlug: community.slug,
      actorId,
      actorName: actorProfile?.full_name || actorProfile?.username || "Someone",
      actionUrl: `/communities/${community.slug}?room=${roomId}`,
    });
  } catch (err) {
    console.error("[messages] mention notify failed:", err);
  }
}
