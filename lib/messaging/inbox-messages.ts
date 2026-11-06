import "server-only";
import { NextResponse } from "next/server";
import type { createClient } from "@/lib/supabase/server";
import {
  escapeIlikePattern,
  sanitizeChatAttachments,
  sanitizeInboxMessageType,
} from "@/lib/community/chat/sanitize-attachments";
import { rateLimit } from "@/lib/ops/rate-limit";
import { notifyUser } from "@/lib/notifications/notify-user";

/**
 * One read/send implementation for 1:1 conversations stored in
 * community_inbox_* — used by community DMs and platform-wide DMs alike.
 * Callers resolve and authorize the conversation first; RLS enforces it again.
 */

type Supa = Awaited<ReturnType<typeof createClient>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = (s: Supa): any => s;

export type InboxConversation = { id: string; community_id: string | null; user_low: string; user_high: string };

export const isParticipant = (conv: InboxConversation, userId: string) => conv.user_low === userId || conv.user_high === userId;

const SELECT_COLS =
  "id, sender_id, body, attachments, message_type, reactions, created_at, is_deleted, reply_to_id, reply_to_body, reply_to_sender, is_edited, edited_at";

export async function listInboxMessages(supabase: Supa, userId: string, conv: InboxConversation, url: URL) {
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10) || 50));
  const before = url.searchParams.get("before");
  const q = url.searchParams.get("q")?.trim();
  const senderId = url.searchParams.get("senderId")?.trim();
  if (q && q.length > 200) return NextResponse.json({ error: "Query too long" }, { status: 400 });

  let query = untyped(supabase).from("community_inbox_messages").select(SELECT_COLS).eq("conversation_id", conv.id).eq("is_deleted", false);
  if (before) query = query.lt("created_at", before);
  if (q) query = query.ilike("body", `%${escapeIlikePattern(q)}%`);
  if (senderId) query = query.eq("sender_id", senderId);
  const { data: rows, error } = await query.order("created_at", { ascending: false }).limit(limit);
  if (error) return NextResponse.json({ error: "Messages are temporarily unavailable." }, { status: 503 });

  const chronological = ((rows ?? []) as { created_at: string; sender_id: string }[]).slice().reverse();
  const nextCursor = chronological.length === limit ? (chronological[0]?.created_at ?? null) : null;

  const senderIds = [...new Set(chronological.map((r) => r.sender_id))];
  const { data: profs } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", senderIds)
    : { data: [] };
  const profileMap = new Map(((profs ?? []) as { id: string }[]).map((p) => [p.id, p]));

  const peerId = conv.user_low === userId ? conv.user_high : conv.user_low;
  const { data: peerRead } = await untyped(supabase)
    .from("messaging_conversation_reads")
    .select("last_read_at")
    .eq("user_id", peerId)
    .eq("conversation_key", `inbox:${conv.id}`)
    .maybeSingle();

  return NextResponse.json({
    messages: chronological.map((r) => ({ ...r, profiles: profileMap.get(r.sender_id) ?? null })),
    nextCursor,
    peerLastReadAt: (peerRead as { last_read_at?: string } | null)?.last_read_at ?? null,
  });
}

export async function sendInboxMessage(supabase: Supa, userId: string, conv: InboxConversation, payload: Record<string, unknown>) {
  const limited = rateLimit(`inbox-write:${userId}`, 90, 60_000);
  if (!limited.allowed) return NextResponse.json({ error: "Too many messages — try again shortly" }, { status: 429 });

  const text = typeof payload.body === "string" ? payload.body.trim().slice(0, 8000) : "";
  const sanitized = sanitizeChatAttachments(payload.attachments);
  if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });
  const attachments = sanitized.attachments;
  const allowCallSignals = payload.message_type === "call_start" || payload.message_type === "call_signal";
  const message_type = sanitizeInboxMessageType(payload.message_type, { allowCallSignals });
  if (!text && attachments.length === 0 && !allowCallSignals) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const row: Record<string, unknown> = { conversation_id: conv.id, sender_id: userId, body: text, attachments, message_type, reactions: {} };
  if (typeof payload.reply_to_id === "string" && payload.reply_to_id) {
    row.reply_to_id = payload.reply_to_id;
    row.reply_to_body = typeof payload.reply_to_body === "string" ? payload.reply_to_body.slice(0, 200) : null;
    row.reply_to_sender = typeof payload.reply_to_sender === "string" ? payload.reply_to_sender.slice(0, 120) : null;
  }

  const { data: msg, error } = await untyped(supabase)
    .from("community_inbox_messages")
    .insert(row)
    .select("id, sender_id, body, attachments, message_type, reactions, created_at, reply_to_id, reply_to_body, reply_to_sender, is_edited")
    .single();
  if (error || !msg) return NextResponse.json({ error: "The message could not be sent. Try again." }, { status: 400 });

  await supabase.from("community_inbox_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conv.id);
  const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", userId).maybeSingle();
  if (!allowCallSignals) {
    const sender = prof as { full_name?: string | null; username?: string | null } | null;
    await notifyNewDirectMessage(supabase, {
      conv,
      senderId: userId,
      senderName: sender?.full_name || sender?.username || "Someone",
      preview: directMessagePreview(message_type, text),
    });
  }
  return NextResponse.json({ message: { ...(msg as Record<string, unknown>), profiles: prof } });
}

/** Short, non-sensitive preview for the recipient's notification. */
export function directMessagePreview(messageType: string, text: string): string {
  if (messageType === "image") return "Sent a photo";
  if (messageType === "audio") return "Sent a voice message";
  if (messageType === "video") return "Sent a video";
  if (messageType === "file") return "Sent a file";
  return text.slice(0, 120) || "Sent a message";
}

/** Notify only the other participant; repeats in one conversation collapse into one unread notification. */
async function notifyNewDirectMessage(
  supabase: Supa,
  input: { conv: InboxConversation; senderId: string; senderName: string; preview: string }
) {
  const recipientId = input.conv.user_low === input.senderId ? input.conv.user_high : input.conv.user_low;
  if (!recipientId || recipientId === input.senderId) return;
  try {
    await notifyUser(supabase as never, {
      userId: recipientId,
      type: "message",
      category: "new_message",
      title: `New message from ${input.senderName}`,
      message: input.preview,
      actionUrl: `/messages?thread=${input.conv.id}`,
      data: {
        event: "direct_message",
        conversation_id: input.conv.id,
        source: input.conv.community_id ? "community" : "direct",
      },
      groupKey: `dm:${input.conv.id}`,
      actorId: input.senderId,
    });
  } catch (e) {
    console.warn("[messages] notify failed", e);
  }
}
