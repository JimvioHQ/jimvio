import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveCommunityBySlugOrId } from "@/lib/community/resolve-community";
import {
  escapeIlikePattern,
  sanitizeChatAttachments,
  sanitizeInboxMessageType,
} from "@/lib/community/chat/sanitize-attachments";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const { slug, conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const community = await resolveCommunityBySlugOrId(supabase, slug);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const { data: conv, error: cErr } = await supabase
    .from("community_inbox_conversations")
    .select("id, community_id, user_low, user_high")
    .eq("id", conversationId)
    .eq("community_id", community.id)
    .maybeSingle();

  if (cErr || !conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.user_low !== user.id && conv.user_high !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const before = searchParams.get("before");
  const q = searchParams.get("q")?.trim();
  const senderId = searchParams.get("senderId")?.trim();

  const selectCols =
    "id, sender_id, body, attachments, message_type, reactions, created_at, is_deleted, reply_to_id, reply_to_body, reply_to_sender, is_edited, edited_at";

  let query = untyped(supabase)
    .from("community_inbox_messages")
    .select(selectCols)
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false);

  if (before) query = query.lt("created_at", before);
  if (q) {
    if (q.length > 200) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }
    query = query.ilike("body", `%${escapeIlikePattern(q)}%`);
  }
  if (senderId) query = query.eq("sender_id", senderId);

  const { data: rows, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  // Fallback if reply/edit columns are not migrated yet.
  let chronological = ((rows ?? []) as { created_at: string; sender_id: string }[])
    .slice()
    .reverse();

  if (error) {
    let fallback = supabase
      .from("community_inbox_messages")
      .select("id, sender_id, body, attachments, message_type, reactions, created_at, is_deleted")
      .eq("conversation_id", conversationId)
      .eq("is_deleted", false);
    if (before) fallback = fallback.lt("created_at", before);
    if (q) fallback = fallback.ilike("body", `%${escapeIlikePattern(q)}%`);
    if (senderId) fallback = fallback.eq("sender_id", senderId);
    const fb = await fallback.order("created_at", { ascending: false }).limit(limit);
    if (fb.error) return NextResponse.json({ error: fb.error.message }, { status: 400 });
    chronological = ((fb.data ?? []) as { created_at: string; sender_id: string }[])
      .slice()
      .reverse();
  }

  const nextCursor =
    chronological.length === limit ? chronological[0]?.created_at ?? null : null;

  const senderIds = [...new Set(chronological.map((r) => r.sender_id))];
  let profileMap = new Map<
    string,
    { full_name: string | null; avatar_url: string | null; username: string | null }
  >();
  if (senderIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .in("id", senderIds);
    profileMap = new Map((profs ?? []).map((p) => [p.id, p]));
  }

  const peerId = conv.user_low === user.id ? conv.user_high : conv.user_low;
  let peerLastReadAt: string | null = null;
  try {
    const { data: peerRead } = await untyped(supabase)
      .from("messaging_conversation_reads")
      .select("last_read_at")
      .eq("user_id", peerId)
      .eq("conversation_key", `inbox:${conversationId}`)
      .maybeSingle();
    peerLastReadAt = peerRead?.last_read_at ?? null;
  } catch {
    peerLastReadAt = null;
  }

  const messages = chronological.map((r) => ({
    ...r,
    profiles: profileMap.get(r.sender_id) ?? null,
  }));

  return NextResponse.json({ messages, nextCursor, peerLastReadAt });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const { slug, conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`inbox-write:${user.id}`, 90, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many messages — try again shortly" },
      { status: 429 }
    );
  }

  const community = await resolveCommunityBySlugOrId(supabase, slug);
  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const { data: conv, error: cErr } = await supabase
    .from("community_inbox_conversations")
    .select("id, community_id, user_low, user_high")
    .eq("id", conversationId)
    .eq("community_id", community.id)
    .maybeSingle();

  if (cErr || !conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (conv.user_low !== user.id && conv.user_high !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = await req.json();
  const text = typeof payload.body === "string" ? payload.body.trim() : "";
  const sanitized = sanitizeChatAttachments(payload.attachments);
  if (!sanitized.ok) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }
  const attachments = sanitized.attachments;
  const allowCallSignals =
    payload.message_type === "call_start" || payload.message_type === "call_signal";
  const message_type = sanitizeInboxMessageType(payload.message_type, {
    allowCallSignals,
  });

  if (!text && attachments.length === 0 && !allowCallSignals) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }

  const reply_to_id =
    typeof payload.reply_to_id === "string" && payload.reply_to_id
      ? payload.reply_to_id
      : null;
  const reply_to_body =
    typeof payload.reply_to_body === "string"
      ? payload.reply_to_body.slice(0, 200)
      : null;
  const reply_to_sender =
    typeof payload.reply_to_sender === "string"
      ? payload.reply_to_sender.slice(0, 120)
      : null;

  const insertRow: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: user.id,
    body: text,
    attachments,
    message_type,
    reactions: {},
  };
  if (reply_to_id) {
    insertRow.reply_to_id = reply_to_id;
    insertRow.reply_to_body = reply_to_body;
    insertRow.reply_to_sender = reply_to_sender;
  }

  let msg: Record<string, unknown> | null = null;
  {
    const { data, error } = await untyped(supabase)
      .from("community_inbox_messages")
      .insert(insertRow)
      .select(
        "id, sender_id, body, attachments, message_type, reactions, created_at, reply_to_id, reply_to_body, reply_to_sender, is_edited"
      )
      .single();

    if (error) {
      // Columns may not exist yet — retry without reply snapshots.
      const { reply_to_id: _a, reply_to_body: _b, reply_to_sender: _c, ...base } = insertRow;
      const fallback = await supabase
        .from("community_inbox_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body: text,
          attachments,
          message_type,
          reactions: {},
        })
        .select("id, sender_id, body, attachments, message_type, reactions, created_at")
        .single();
      if (fallback.error) {
        return NextResponse.json({ error: fallback.error.message }, { status: 400 });
      }
      msg = fallback.data as Record<string, unknown>;
    } else {
      msg = data as Record<string, unknown>;
    }
  }

  await supabase
    .from("community_inbox_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, username")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ message: { ...msg, profiles: prof } });
}
