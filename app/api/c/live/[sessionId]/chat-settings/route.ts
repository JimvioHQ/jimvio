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

  const { data: settings } = await supabase
    .from("live_chat_settings")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  return NextResponse.json({ settings: settings || {
    slow_mode_seconds: 0,
    followers_only: false,
    subscribers_only: false,
    emote_only: false,
    blocked_words: [],
    blocked_domains: [],
    max_message_length: 500,
    auto_mod_level: 1,
    allow_links: true,
  }});
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select("host_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can modify chat settings" }, { status: 403 });
  }

  const body = await request.json();
  const {
    slowModeSeconds,
    followersOnly,
    subscribersOnly,
    emoteOnly,
    blockedWords,
    blockedDomains,
    maxMessageLength,
    autoModLevel,
    allowLinks,
  } = body;

  const { data: settings, error } = await supabase
    .from("live_chat_settings")
    .upsert({
      session_id: sessionId,
      slow_mode_seconds: slowModeSeconds ?? 0,
      followers_only: followersOnly ?? false,
      subscribers_only: subscribersOnly ?? false,
      emote_only: emoteOnly ?? false,
      blocked_words: blockedWords || [],
      blocked_domains: blockedDomains || [],
      max_message_length: maxMessageLength ?? 500,
      auto_mod_level: autoModLevel ?? 1,
      allow_links: allowLinks ?? true,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}