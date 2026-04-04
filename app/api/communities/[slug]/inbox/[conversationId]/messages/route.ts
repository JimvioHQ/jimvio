import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; conversationId: string }> }
) {
  const { slug, conversationId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .single();

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

  const { data: rows, error } = await supabase
    .from("community_inbox_messages")
    .select("id, sender_id, body, attachments, message_type, reactions, created_at")
    .eq("conversation_id", conversationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const senderIds = [...new Set((rows ?? []).map((r) => r.sender_id))];
  let profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; username: string | null }>();
  if (senderIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", senderIds);
    profileMap = new Map((profs ?? []).map((p) => [p.id, p]));
  }

  const messages = (rows ?? []).map((r) => ({
    ...r,
    profiles: profileMap.get(r.sender_id) ?? null,
  }));

  return NextResponse.json({ messages });
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

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .single();

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
  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const message_type = typeof payload.message_type === "string" ? payload.message_type : "text";

  if (!text && attachments.length === 0) return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });

  const { data: msg, error } = await supabase
    .from("community_inbox_messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: text,
      attachments,
      message_type,
      reactions: {}
    })
    .select("id, sender_id, body, attachments, message_type, reactions, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from("community_inbox_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId);

  const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url, username").eq("id", user.id).maybeSingle();

  return NextResponse.json({ message: { ...msg, profiles: prof } });
}
