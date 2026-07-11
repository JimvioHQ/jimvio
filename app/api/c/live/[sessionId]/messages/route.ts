import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const before = searchParams.get("before");

  let query = supabase
    .from("live_session_messages")
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: (messages || []).reverse() });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { data: participant } = await supabase
    .from("live_session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    return NextResponse.json({ error: "Not joined to session" }, { status: 400 });
  }

  const body = await request.json();
  const { body: messageBody, messageType = "chat", metadata = {} } = body;

  if (!messageBody?.trim()) {
    return NextResponse.json({ error: "Message body required" }, { status: 400 });
  }

  const { data: message, error } = await supabase
    .from("live_session_messages")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      body: messageBody,
      message_type: messageType,
      metadata,
    })
    .select(`
      *,
      user:profiles!user_id (id, full_name, avatar_url, username)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message });
}