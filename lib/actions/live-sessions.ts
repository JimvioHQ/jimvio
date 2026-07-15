"use server";

import { createClient } from "@/lib/supabase/server";
import { canAccessSpace } from "@/services/accessControl";
import { revalidatePath } from "next/cache";

export interface LiveSessionInput {
  spaceId: string;
  title: string;
  description?: string;
  privacy?: "public" | "private" | "members_only";
  scheduledAt?: string;
  maxViewers?: number;
  settings?: Record<string, unknown>;
}

export interface LiveSessionResponse {
  id: string;
  space_id: string;
  community_id: string;
  host_id: string;
  title: string;
  description: string | null;
  status: string;
  privacy: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  max_viewers: number;
  viewer_count: number;
  peak_viewers: number;
  stream_key: string | null;
  playback_url: string | null;
  recording_url: string | null;
  recording_started_at: string | null;
  recording_ended_at: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export async function createLiveSession(
  input: LiveSessionInput
): Promise<{ session?: LiveSessionResponse; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("id, community_id, access_type")
    .eq("id", input.spaceId)
    .single();

  if (!space) {
    return { error: "Space not found" };
  }

  const hasAccess = await canAccessSpace(user.id, space.id);
  if (!hasAccess) {
    return { error: "You don't have access to this space" };
  }

  const streamKey = `live_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const { data: session, error } = await supabase
    .from("live_sessions")
    .insert({
      space_id: input.spaceId,
      community_id: space.community_id,
      host_id: user.id,
      title: input.title,
      description: input.description ?? null,
      privacy: input.privacy ?? "public",
      status: input.scheduledAt ? "scheduled" : "live",
      scheduled_at: input.scheduledAt ?? null,
      max_viewers: input.maxViewers ?? 100,
      stream_key: streamKey,
      settings: input.settings ?? {},
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/c/${space.community_id}/live`);
  revalidatePath(`/c/live`);

  return { session };
}

export async function startLiveSession(
  sessionId: string
): Promise<{ session?: LiveSessionResponse; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: session, error } = await supabase
    .from("live_sessions")
    .update({
      status: "live",
      started_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/c/live/${sessionId}`);

  return { session };
}

export async function endLiveSession(
  sessionId: string
): Promise<{ session?: LiveSessionResponse; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: session, error } = await supabase
    .from("live_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase
    .from("live_session_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .is("left_at", null);

  revalidatePath(`/c/live/${sessionId}`);
  revalidatePath(`/c/live`);

  return { session };
}

export async function joinLiveSession(
  sessionId: string
): Promise<{ participant?: { id: string; session_id: string; user_id: string; role: string; joined_at: string }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  const { data: existing } = await supabase
    .from("live_session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (existing) {
    return { participant: existing };
  }

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, max_viewers, viewer_count")
    .eq("id", sessionId)
    .single();

  if (session && session.viewer_count >= session.max_viewers) {
    return { error: "Session is full" };
  }

  const { data: participant, error } = await supabase
    .from("live_session_participants")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      role: "viewer",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.rpc("increment_viewer_count", { session_id: sessionId });

  return { participant };
}

export async function leaveLiveSession(
  sessionId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  await supabase
    .from("live_session_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null);

  await supabase.rpc("decrement_viewer_count", { session_id: sessionId });

  return {};
}

export async function getLiveSession(
  sessionId: string
): Promise<{ session?: LiveSessionResponse & { space?: { id: string; name: string; slug: string } }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  const { data: session, error } = await supabase
    .from("live_sessions")
    .select(`
      *,
      space:spaces!space_id (id, name, slug)
    `)
    .eq("id", sessionId)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { session };
}

export async function getLiveSessionsForSpace(
  spaceId: string,
  options?: { status?: string; limit?: number }
): Promise<{ sessions?: LiveSessionResponse[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canAccessSpace(user.id, spaceId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  let query = supabase
    .from("live_sessions")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 20);

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data: sessions, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { sessions: sessions ?? [] };
}

export async function canUserAccessLiveSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, community_id, space_id, host_id, privacy")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return false;
  }

  if (session.host_id === userId) {
    return true;
  }

  if (session.privacy === "public") {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", session.community_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    return !!membership;
  }

  const hasSpaceAccess = await canAccessSpace(userId, session.space_id);
  if (!hasSpaceAccess) {
    return false;
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", session.community_id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return !!membership;
}

export async function sendLiveSessionMessage(
  sessionId: string,
  body: string,
  messageType: "chat" | "reaction" | "poll" = "chat",
  metadata: Record<string, unknown> = {}
): Promise<{ message?: { id: string; session_id: string; user_id: string; body: string; message_type: string; metadata: Record<string, unknown>; created_at: string }; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  const { data: participant } = await supabase
    .from("live_session_participants")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  if (!participant) {
    return { error: "Not joined to session" };
  }

  const { data: message, error } = await supabase
    .from("live_session_messages")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      body,
      message_type: messageType,
      metadata,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { message };
}

export async function getLiveSessionMessages(
  sessionId: string,
  limit = 50,
  before?: string
): Promise<{ messages?: { id: string; session_id: string; user_id: string; body: string; message_type: string; metadata: Record<string, unknown>; created_at: string; user?: { full_name: string | null; avatar_url: string | null; username: string | null } }[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  let query = supabase
    .from("live_session_messages")
    .select(`
      *,
      user:profiles!user_id (full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data: messages, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { messages: (messages ?? []).reverse() };
}

export async function getLiveSessionParticipants(
  sessionId: string
): Promise<{ participants?: { id: string; session_id: string; user_id: string; role: string; joined_at: string; left_at: string | null; user?: { full_name: string | null; avatar_url: string | null; username: string | null } }[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return { error: "Access denied" };
  }

  const { data: participants, error } = await supabase
    .from("live_session_participants")
    .select(`
      *,
      user:profiles!user_id (full_name, avatar_url, username)
    `)
    .eq("session_id", sessionId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { participants: participants ?? [] };
}