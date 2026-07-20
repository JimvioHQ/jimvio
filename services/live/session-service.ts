import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import {
  canAcceptSpeaker,
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canMuteParticipant,
  canRejectSpeaker,
  canRemoveSpeaker,
  COMMUNITY_STAFF_ROLES,
  type LiveParticipantStatus,
  type LiveStageRole,
} from "@/lib/live/roles";

export type LiveSessionRow = {
  id: string;
  community_id: string;
  /** Production schema uses space_id; room_id added by 082 repair for chat binding. */
  space_id: string;
  room_id: string | null;
  host_id: string;
  title: string;
  status: "scheduled" | "live" | "ended";
  started_at: string;
  ended_at: string | null;
  created_at: string;
};

export type LiveParticipantRow = {
  id: string;
  session_id: string;
  user_id: string;
  role: LiveStageRole;
  status: LiveParticipantStatus;
  mic_on: boolean;
  cam_on: boolean;
  hand_raised: boolean;
  sharing: boolean;
  joined_at: string;
  updated_at: string;
};

function db() {
  return createServiceRoleClient();
}

async function assertCommunityStaff(userId: string, communityId: string) {
  const { data: community } = await db()
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .single();
  if (community?.owner_id === userId) return true;
  const membership = await getUserMembership(userId, communityId);
  if (!isMembershipActive(membership)) return false;
  return COMMUNITY_STAFF_ROLES.has(membership?.role ?? "");
}

async function assertCommunityMember(userId: string, communityId: string) {
  const { data: community } = await db()
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .single();
  if (community?.owner_id === userId) return true;
  const membership = await getUserMembership(userId, communityId);
  return isMembershipActive(membership);
}

export async function getParticipant(
  sessionId: string,
  userId: string
): Promise<LiveParticipantRow | null> {
  const { data } = await db()
    .from("live_session_participants")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as LiveParticipantRow | null) ?? null;
}

export async function getSession(sessionId: string): Promise<LiveSessionRow | null> {
  const { data } = await db().from("live_sessions").select("*").eq("id", sessionId).maybeSingle();
  return (data as LiveSessionRow | null) ?? null;
}

export async function listParticipants(sessionId: string): Promise<LiveParticipantRow[]> {
  const { data } = await db()
    .from("live_session_participants")
    .select("*")
    .eq("session_id", sessionId)
    .order("joined_at", { ascending: true });
  return (data as LiveParticipantRow[]) ?? [];
}

export async function createLiveSession(input: {
  userId: string;
  communityId: string;
  roomId?: string | null;
  title?: string;
}): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const ok = await assertCommunityStaff(input.userId, input.communityId);
  if (!ok) return { error: "Only community staff can create a live session", status: 403 };

  let roomId = input.roomId ?? null;
  let spaceId: string | null = null;

  if (roomId) {
    const { data: room } = await db()
      .from("rooms")
      .select("id, space_id, community_id")
      .eq("id", roomId)
      .eq("community_id", input.communityId)
      .maybeSingle();
    if (!room) return { error: "Room not found in community", status: 400 };
    spaceId = room.space_id;
  } else {
    const { data: room } = await db()
      .from("rooms")
      .select("id, space_id")
      .eq("community_id", input.communityId)
      .eq("room_type", "chat")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    roomId = room?.id ?? null;
    spaceId = room?.space_id ?? null;
  }

  if (!spaceId) {
    const { data: space } = await db()
      .from("spaces")
      .select("id")
      .eq("community_id", input.communityId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    spaceId = space?.id ?? null;
  }

  if (!spaceId) {
    return { error: "Community has no space for live session", status: 400 };
  }

  const now = new Date().toISOString();
  const { data: session, error } = await db()
    .from("live_sessions")
    .insert({
      community_id: input.communityId,
      space_id: spaceId,
      room_id: roomId,
      host_id: input.userId,
      title: input.title?.trim() || "Community Live Room",
      status: "live",
      privacy: "private",
      started_at: now,
      max_viewers: 100,
      viewer_count: 0,
      peak_viewers: 0,
      settings: {},
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !session) return { error: error?.message ?? "Failed to create session", status: 400 };

  await db().from("live_session_participants").upsert(
    {
      session_id: session.id,
      user_id: input.userId,
      role: "host",
      status: "joined",
      mic_on: true,
      cam_on: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );

  return { session: session as LiveSessionRow };
}

export async function joinLiveSession(
  sessionId: string,
  userId: string
): Promise<{ participant: LiveParticipantRow; session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.status !== "live") return { error: "Session is not live", status: 400 };

  const member = await assertCommunityMember(userId, session.community_id);
  if (!member) return { error: "Not a community member", status: 403 };

  const existing = await getParticipant(sessionId, userId);
  if (existing && existing.status === "removed") {
    return { error: "You were removed from this session", status: 403 };
  }

  const role: LiveStageRole =
    existing?.role && existing.status !== "left"
      ? existing.role
      : session.host_id === userId
        ? "host"
        : "viewer";

  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        role,
        status: "joined",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,user_id" }
    )
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Join failed", status: 400 };
  return { participant: data as LiveParticipantRow, session };
}

export async function leaveLiveSession(
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.host_id === userId && session.status === "live") {
    return { error: "Host must end the live session", status: 400 };
  }
  await db()
    .from("live_session_participants")
    .update({ status: "left", updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  return { ok: true };
}

export async function endLiveSession(
  sessionId: string,
  userId: string
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (!canEndLive(role) && session.host_id !== userId) {
    return { error: "Only the host can end live", status: 403 };
  }

  const { data, error } = await db()
    .from("live_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "End failed", status: 400 };

  await db()
    .from("live_session_participants")
    .update({ status: "left", updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .neq("status", "removed");

  return { session: data as LiveSessionRow };
}

export async function inviteSpeaker(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canInviteSpeaker(actor.role)) return { error: "Not allowed", status: 403 };

  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: targetUserId,
        role: "viewer",
        status: "invited",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,user_id" }
    )
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Invite failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function requestSpeak(
  sessionId: string,
  userId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        role: "viewer",
        status: "requested",
        hand_raised: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id,user_id" }
    )
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Request failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function acceptInvite(
  sessionId: string,
  userId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "invited") {
    return { error: "No pending invite", status: 400 };
  }
  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      role: "speaker",
      status: "joined",
      hand_raised: false,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Accept failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function acceptSpeaker(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canAcceptSpeaker(actor.role)) return { error: "Not allowed", status: 403 };

  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      role: "speaker",
      status: "joined",
      hand_raised: false,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Accept failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function rejectSpeaker(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canRejectSpeaker(actor.role)) return { error: "Not allowed", status: 403 };
  await db()
    .from("live_session_participants")
    .update({
      status: "rejected",
      hand_raised: false,
      role: "viewer",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId);
  return { ok: true };
}

export async function removeSpeaker(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canRemoveSpeaker(actor.role)) return { error: "Not allowed", status: 403 };
  const session = await getSession(sessionId);
  if (session?.host_id === targetUserId) return { error: "Cannot remove host", status: 400 };

  await db()
    .from("live_session_participants")
    .update({
      status: "removed",
      role: "viewer",
      mic_on: false,
      cam_on: false,
      sharing: false,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId);
  return { ok: true };
}

export async function muteParticipant(
  sessionId: string,
  actorId: string,
  targetUserId: string,
  micOn: boolean
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canMuteParticipant(actor.role)) return { error: "Not allowed", status: 403 };

  const { data, error } = await db()
    .from("live_session_participants")
    .update({ mic_on: micOn, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Mute failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function updateSelfMedia(
  sessionId: string,
  userId: string,
  patch: Partial<Pick<LiveParticipantRow, "mic_on" | "cam_on" | "hand_raised" | "sharing">>
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "joined") return { error: "Not in session", status: 403 };

  const { data, error } = await db()
    .from("live_session_participants")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function createPoll(
  sessionId: string,
  userId: string,
  question: string,
  options: string[]
): Promise<{ poll: Record<string, unknown> } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, userId);
  if (!actor || !canLaunchPoll(actor.role)) return { error: "Not allowed", status: 403 };
  if (!question.trim() || options.length < 2) {
    return { error: "Poll needs a question and at least 2 options", status: 400 };
  }

  const { data, error } = await db()
    .from("live_polls")
    .insert({
      session_id: sessionId,
      created_by: userId,
      question: question.trim(),
      options,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Poll failed", status: 400 };
  return { poll: data };
}

export async function getActiveLiveForCommunity(communityId: string) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("community_id", communityId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LiveSessionRow | null) ?? null;
}

export async function getActiveLiveForUser(userId: string) {
  const { data } = await db()
    .from("live_session_participants")
    .select("session_id, live_sessions(*)")
    .eq("user_id", userId)
    .eq("status", "joined")
    .order("joined_at", { ascending: false })
    .limit(5);
  const rows = (data ?? []) as unknown as Array<{ live_sessions: LiveSessionRow | LiveSessionRow[] | null }>;
  return rows
    .map((r) => (Array.isArray(r.live_sessions) ? r.live_sessions[0] : r.live_sessions))
    .filter((s): s is LiveSessionRow => Boolean(s && s.status === "live"));
}
