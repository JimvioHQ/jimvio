import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import { notifyCommunityLiveEvent } from "@/lib/community/notify-live";
import {
  canAcceptSpeaker,
  canChangeRoles,
  canEndLive,
  canInviteSpeaker,
  canLaunchPoll,
  canMuteParticipant,
  canRejectSpeaker,
  canRemoveSpeaker,
  COMMUNITY_STAFF_ROLES,
  type LiveParticipantStatus,
  type LiveSessionStatus,
  type LiveStageRole,
} from "@/lib/live/roles";

export type LiveSessionPrivacy = "public" | "private" | "invite_only";

export type LiveChatSettings = {
  slow_mode_seconds?: number;
  /** Future-ready gate — not enforced until subscriptions product ships. */
  subscribers_only?: boolean;
};

export type LiveSessionRow = {
  id: string;
  community_id: string | null;
  /** Production schema uses space_id; room_id added by 082 repair for chat binding. */
  space_id: string | null;
  room_id: string | null;
  host_id: string;
  title: string;
  status: LiveSessionStatus;
  /** Community-scoped privacy. private = members; invite_only = invited/staff. */
  privacy?: LiveSessionPrivacy | string | null;
  scheduled_at?: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  viewer_count?: number | null;
  peak_viewers?: number | null;
  max_viewers?: number | null;
  total_watch_seconds?: number | null;
  viewer_sample_sum?: number | null;
  viewer_sample_count?: number | null;
  engagement_events?: number | null;
  settings?: Record<string, unknown> | null;
  recording_url?: string | null;
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
  left_at?: string | null;
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

/** Matches workspace `live.manage` (owner/admin/moderator/creator). */
async function assertCanHostLive(userId: string, communityId: string) {
  const { data: community } = await db()
    .from("communities")
    .select("owner_id")
    .eq("id", communityId)
    .single();
  if (community?.owner_id === userId) return true;
  const membership = await getUserMembership(userId, communityId);
  if (!isMembershipActive(membership)) return false;
  const role = membership?.role ?? "";
  return COMMUNITY_STAFF_ROLES.has(role) || role === "creator";
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

/** True when the user may view session metadata (member / owner / public creator live). */
export async function canViewLiveSession(
  userId: string,
  session: LiveSessionRow
): Promise<boolean> {
  if (!session.community_id) {
    const privacy = normalizePrivacy(session.privacy);
    if (privacy === "public") return true;
    if (session.host_id === userId) return true;
    const participant = await getParticipant(session.id, userId);
    return Boolean(
      participant &&
        (participant.status === "joined" ||
          participant.status === "invited" ||
          participant.role === "cohost" ||
          participant.role === "speaker" ||
          participant.role === "moderator")
    );
  }
  return assertCommunityMember(userId, session.community_id);
}

function normalizePrivacy(raw: string | null | undefined): LiveSessionPrivacy {
  const v = (raw ?? "private").toLowerCase();
  if (v === "public" || v === "invite_only") return v;
  return "private";
}

export async function listParticipants(sessionId: string): Promise<LiveParticipantRow[]> {
  const { data } = await db()
    .from("live_session_participants")
    .select("*")
    .eq("session_id", sessionId)
    .in("status", ["joined", "requested", "invited"])
    .order("joined_at", { ascending: true })
    .limit(250);
  return (data as LiveParticipantRow[]) ?? [];
}

async function resolveSpaceAndRoom(input: {
  communityId: string;
  roomId?: string | null;
  spaceId?: string | null;
}): Promise<
  | { roomId: string | null; spaceId: string }
  | { error: string; status: number }
> {
  let roomId = input.roomId ?? null;
  let spaceId: string | null = input.spaceId ?? null;

  if (spaceId) {
    const { data: space } = await db()
      .from("spaces")
      .select("id, community_id")
      .eq("id", spaceId)
      .eq("community_id", input.communityId)
      .maybeSingle();
    if (!space) return { error: "Space not found in community", status: 400 };
  }

  if (roomId) {
    const { data: room } = await db()
      .from("rooms")
      .select("id, space_id, community_id")
      .eq("id", roomId)
      .eq("community_id", input.communityId)
      .maybeSingle();
    if (!room) return { error: "Room not found in community", status: 400 };
    if (spaceId && room.space_id !== spaceId) {
      return { error: "Room does not belong to space", status: 400 };
    }
    spaceId = spaceId ?? room.space_id;
  } else if (spaceId) {
    const { data: room } = await db()
      .from("rooms")
      .select("id, space_id")
      .eq("space_id", spaceId)
      .eq("community_id", input.communityId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    roomId = room?.id ?? null;
  } else {
    // Prefer a live/voice space, then any space with a chat room.
    const { data: typedSpace } = await db()
      .from("spaces")
      .select("id")
      .eq("community_id", input.communityId)
      .eq("is_active", true)
      .in("space_type", ["live", "voice"])
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (typedSpace?.id) {
      spaceId = typedSpace.id;
      const { data: room } = await db()
        .from("rooms")
        .select("id")
        .eq("space_id", typedSpace.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(1)
        .maybeSingle();
      roomId = room?.id ?? null;
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

  return { roomId, spaceId };
}

async function assertNoActiveLiveInSpace(spaceId: string) {
  const { data } = await db()
    .from("live_sessions")
    .select("id")
    .eq("space_id", spaceId)
    .eq("status", "live")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function assertNoActiveCreatorLive(hostId: string) {
  const { data } = await db()
    .from("live_sessions")
    .select("id")
    .eq("host_id", hostId)
    .is("community_id", null)
    .eq("status", "live")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Resume an existing live session for this host instead of failing with 409. */
async function getExistingCreatorLive(hostId: string): Promise<LiveSessionRow | null> {
  const id = await assertNoActiveCreatorLive(hostId);
  if (!id) return null;
  return getSession(id);
}

async function communitySlug(communityId: string | null | undefined): Promise<string | null> {
  if (!communityId) return null;
  const { data } = await db()
    .from("communities")
    .select("slug")
    .eq("id", communityId)
    .maybeSingle();
  return data?.slug ?? null;
}

function normalizeChatSettings(raw: LiveChatSettings | undefined): Record<string, unknown> {
  const slow =
    typeof raw?.slow_mode_seconds === "number" && raw.slow_mode_seconds >= 0
      ? Math.min(300, Math.floor(raw.slow_mode_seconds))
      : 0;
  return {
    chat: {
      slow_mode_seconds: slow,
      subscribers_only: Boolean(raw?.subscribers_only),
    },
  };
}

export async function createLiveSession(input: {
  userId: string;
  /** When omitted/null, creates an independent Creator Live (no community). */
  communityId?: string | null;
  roomId?: string | null;
  spaceId?: string | null;
  title?: string;
  privacy?: LiveSessionPrivacy;
  /** ISO timestamp — when set in the future, creates a scheduled session. */
  scheduledAt?: string | null;
  chatSettings?: LiveChatSettings;
}): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const communityId = input.communityId?.trim() || null;
  const isCreatorLive = !communityId;

  if (!isCreatorLive) {
    const ok = await assertCanHostLive(input.userId, communityId);
    if (!ok) return { error: "Only community hosts can create a live session", status: 403 };
  }

  let roomId: string | null = null;
  let spaceId: string | null = null;

  if (!isCreatorLive) {
    const resolved = await resolveSpaceAndRoom({
      communityId,
      roomId: input.roomId,
      spaceId: input.spaceId,
    });
    if ("error" in resolved) return resolved;
    roomId = resolved.roomId;
    spaceId = resolved.spaceId;
  }

  const scheduledAt = input.scheduledAt?.trim() || null;
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const isSchedule =
    scheduleDate != null &&
    !Number.isNaN(scheduleDate.getTime()) &&
    scheduleDate.getTime() > Date.now() + 30_000;

  if (!isSchedule) {
    if (isCreatorLive) {
      const existingCreator = await getExistingCreatorLive(input.userId);
      if (existingCreator) {
        // Idempotent Go Live — resume the active creator session instead of 409.
        return { session: existingCreator };
      }
    } else if (spaceId) {
      const existingLive = await assertNoActiveLiveInSpace(spaceId);
      if (existingLive) {
        const existing = await getSession(existingLive);
        if (existing && existing.host_id === input.userId) {
          return { session: existing };
        }
        return {
          error: "This space already has a live session",
          status: 409,
        };
      }
    }
  }

  const now = new Date().toISOString();
  const privacy = normalizePrivacy(input.privacy ?? (isCreatorLive ? "public" : "private"));
  const settings = {
    ...normalizeChatSettings(input.chatSettings),
    live_kind: isCreatorLive ? "creator" : "community",
  };

  const { data: session, error } = await db()
    .from("live_sessions")
    .insert({
      community_id: communityId,
      space_id: spaceId,
      room_id: roomId,
      host_id: input.userId,
      title:
        input.title?.trim() ||
        (isCreatorLive ? "Creator Live" : "Community Live Room"),
      status: isSchedule ? "scheduled" : "live",
      privacy,
      scheduled_at: isSchedule ? scheduleDate!.toISOString() : null,
      started_at: isSchedule ? null : now,
      max_viewers: 100,
      viewer_count: 0,
      peak_viewers: 0,
      total_watch_seconds: 0,
      viewer_sample_sum: 0,
      viewer_sample_count: 0,
      engagement_events: 0,
      settings,
      updated_at: now,
    })
    .select("*")
    .single();

  if (error || !session) {
    if (error?.code === "23505") {
      return {
        error: isCreatorLive
          ? "You already have a live session"
          : "This space already has a live session",
        status: 409,
      };
    }
    return { error: error?.message ?? "Failed to create session", status: 400 };
  }

  if (!isSchedule) {
    await db().from("live_session_participants").upsert(
      {
        session_id: session.id,
        user_id: input.userId,
        role: "host",
        status: "joined",
        mic_on: true,
        cam_on: true,
        left_at: null,
        updated_at: now,
      },
      { onConflict: "session_id,user_id" }
    );
  }

  if (communityId) {
    const slug = await communitySlug(communityId);
    if (slug) {
      void notifyCommunityLiveEvent(db(), {
        communityId,
        actorId: input.userId,
        communitySlug: slug,
        sessionId: session.id,
        event: isSchedule ? "live_scheduled" : "live_started",
        title: isSchedule ? "Live scheduled" : "Live started",
        message: isSchedule
          ? `${(session as LiveSessionRow).title} is scheduled`
          : `${(session as LiveSessionRow).title} is live now`,
      }).catch(() => undefined);
    }
  }

  return { session: session as LiveSessionRow };
}

export async function startScheduledLive(
  sessionId: string,
  userId: string
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.status !== "scheduled") {
    return { error: "Session is not scheduled", status: 400 };
  }
  if (session.host_id !== userId) {
    if (!session.community_id) {
      return { error: "Only the host can start this live", status: 403 };
    }
    const staff = await assertCanHostLive(userId, session.community_id);
    if (!staff) return { error: "Only the host can start this live", status: 403 };
  }

  if (session.space_id) {
    const conflict = await assertNoActiveLiveInSpace(session.space_id);
    if (conflict && conflict !== sessionId) {
      return { error: "This space already has a live session", status: 409 };
    }
  } else {
    const conflict = await assertNoActiveCreatorLive(session.host_id);
    if (conflict && conflict !== sessionId) {
      return { error: "You already have a live session", status: 409 };
    }
  }

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_sessions")
    .update({
      status: "live",
      started_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("status", "scheduled")
    .select("*")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { error: "This space already has a live session", status: 409 };
    }
    return { error: error?.message ?? "Start failed", status: 400 };
  }

  await db().from("live_session_participants").upsert(
    {
      session_id: sessionId,
      user_id: session.host_id,
      role: "host",
      status: "joined",
      mic_on: true,
      cam_on: true,
      left_at: null,
      updated_at: now,
    },
    { onConflict: "session_id,user_id" }
  );

  const slug = await communitySlug(session.community_id);
  if (slug && session.community_id) {
    void notifyCommunityLiveEvent(db(), {
      communityId: session.community_id,
      actorId: userId,
      communitySlug: slug,
      sessionId,
      event: "live_started",
      title: "Live started",
      message: `${session.title} is live now`,
    }).catch(() => undefined);
  }

  return { session: data as LiveSessionRow };
}

export async function cancelLiveSession(
  sessionId: string,
  userId: string
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.status !== "scheduled") {
    return { error: "Only scheduled lives can be cancelled", status: 400 };
  }
  if (session.host_id !== userId) {
    if (!session.community_id) {
      return { error: "Only the host can cancel", status: 403 };
    }
    const staff = await assertCanHostLive(userId, session.community_id);
    if (!staff) return { error: "Only the host can cancel", status: 403 };
  }

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_sessions")
    .update({
      status: "cancelled",
      ended_at: now,
      updated_at: now,
    })
    .eq("id", sessionId)
    .eq("status", "scheduled")
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Cancel failed", status: 400 };
  return { session: data as LiveSessionRow };
}

/** Fire reminder notifications for sessions starting within the next window. */
export async function sendDueLiveReminders(withinMinutes = 15): Promise<number> {
  const now = Date.now();
  const until = new Date(now + withinMinutes * 60_000).toISOString();
  const since = new Date(now - 60_000).toISOString();

  const { data: sessions } = await db()
    .from("live_sessions")
    .select("*")
    .eq("status", "scheduled")
    .gte("scheduled_at", since)
    .lte("scheduled_at", until)
    .limit(20);

  let sent = 0;
  for (const raw of sessions ?? []) {
    const session = raw as LiveSessionRow;
    const settings = (session.settings ?? {}) as Record<string, unknown>;
    if (settings.reminder_sent === true) continue;

    const slug = await communitySlug(session.community_id);
    if (!slug || !session.community_id) continue;

    await notifyCommunityLiveEvent(db(), {
      communityId: session.community_id,
      actorId: session.host_id,
      communitySlug: slug,
      sessionId: session.id,
      event: "live_reminder",
      title: "Live starting soon",
      message: `${session.title} starts soon`,
    });

    await db()
      .from("live_sessions")
      .update({
        settings: { ...settings, reminder_sent: true },
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    sent += 1;
  }
  return sent;
}

export async function joinLiveSession(
  sessionId: string,
  userId: string
): Promise<{ participant: LiveParticipantRow; session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.status === "ended" || session.status === "cancelled") {
    return { error: "Session has ended", status: 400 };
  }
  if (session.status === "scheduled") {
    return { error: "Session has not started yet", status: 400 };
  }
  if (session.status !== "live") return { error: "Session is not live", status: 400 };

  const privacy = normalizePrivacy(session.privacy);
  if (session.community_id) {
    const member = await assertCommunityMember(userId, session.community_id);
    if (!member && privacy !== "public") {
      return { error: "Not a community member", status: 403 };
    }
  } else if (privacy === "private" && session.host_id !== userId) {
    const existingPreview = await getParticipant(sessionId, userId);
    const invited =
      existingPreview?.status === "invited" ||
      existingPreview?.status === "joined" ||
      existingPreview?.role === "cohost" ||
      existingPreview?.role === "speaker" ||
      existingPreview?.role === "moderator";
    if (!invited) {
      return { error: "This live is private", status: 403 };
    }
  }

  const existing = await getParticipant(sessionId, userId);
  if (existing && existing.status === "removed") {
    return { error: "You were removed from this session", status: 403 };
  }
  if (existing && existing.status === "rejected") {
    return { error: "Your request was declined", status: 403 };
  }

  if (privacy === "invite_only" && session.host_id !== userId) {
    const staff = session.community_id
      ? await assertCommunityStaff(userId, session.community_id)
      : false;
    const invited =
      existing?.status === "invited" ||
      existing?.status === "joined" ||
      existing?.role === "cohost" ||
      existing?.role === "speaker" ||
      existing?.role === "moderator";
    if (!staff && !invited) {
      return { error: "This live is invite-only", status: 403 };
    }
  }

  const maxViewers = session.max_viewers ?? 100;
  if (!existing || existing.status !== "joined") {
    const { count } = await db()
      .from("live_session_participants")
      .select("id", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "joined");
    if ((count ?? 0) >= maxViewers && session.host_id !== userId) {
      return { error: "Live session is at capacity", status: 429 };
    }
  }

  const role: LiveStageRole =
    existing?.role && existing.status !== "left" && existing.status !== "rejected"
      ? existing.role
      : session.host_id === userId
        ? "host"
        : "viewer";

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        role,
        status: "joined",
        left_at: null,
        joined_at: existing?.status === "joined" ? existing.joined_at : now,
        updated_at: now,
      },
      { onConflict: "session_id,user_id" }
    )
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Join failed", status: 400 };
  await syncViewerCount(sessionId);
  return { participant: data as LiveParticipantRow, session };
}

async function syncViewerCount(sessionId: string): Promise<void> {
  const { count } = await db()
    .from("live_session_participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "joined");
  const viewerCount = count ?? 0;
  const session = await getSession(sessionId);
  const peak = Math.max(session?.peak_viewers ?? 0, viewerCount);
  await db()
    .from("live_sessions")
    .update({
      viewer_count: viewerCount,
      peak_viewers: peak,
      viewer_sample_sum: (session?.viewer_sample_sum ?? 0) + viewerCount,
      viewer_sample_count: (session?.viewer_sample_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

async function accumulateWatchTime(
  sessionId: string,
  joinedAt: string | null | undefined
): Promise<void> {
  if (!joinedAt) return;
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(joinedAt).getTime()) / 1000)
  );
  if (seconds <= 0) return;
  const session = await getSession(sessionId);
  await db()
    .from("live_sessions")
    .update({
      total_watch_seconds: (session?.total_watch_seconds ?? 0) + seconds,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);
}

export async function leaveLiveSession(
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session) return { error: "Session not found", status: 404 };
  if (session.host_id === userId && session.status === "live") {
    return { error: "Host must end the live session or transfer host first", status: 400 };
  }
  const existing = await getParticipant(sessionId, userId);
  const now = new Date().toISOString();
  await db()
    .from("live_session_participants")
    .update({ status: "left", left_at: now, updated_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  if (existing?.status === "joined") {
    await accumulateWatchTime(sessionId, existing.joined_at);
  }
  await syncViewerCount(sessionId);
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

  // Accrue watch time for still-joined participants.
  const { data: stillJoined } = await db()
    .from("live_session_participants")
    .select("joined_at")
    .eq("session_id", sessionId)
    .eq("status", "joined");
  let watchAdd = 0;
  for (const row of stillJoined ?? []) {
    if (!row.joined_at) continue;
    watchAdd += Math.max(
      0,
      Math.floor((Date.now() - new Date(row.joined_at as string).getTime()) / 1000)
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_sessions")
    .update({
      status: "ended",
      ended_at: now,
      total_watch_seconds: (session.total_watch_seconds ?? 0) + watchAdd,
      updated_at: now,
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "End failed", status: 400 };

  await db()
    .from("live_session_participants")
    .update({ status: "left", left_at: now, updated_at: now })
    .eq("session_id", sessionId)
    .neq("status", "removed");

  const slug = await communitySlug(session.community_id);
  if (slug && session.community_id) {
    void notifyCommunityLiveEvent(db(), {
      communityId: session.community_id,
      actorId: userId,
      communitySlug: slug,
      sessionId,
      event: "live_ended",
      title: "Live ended",
      message: `${session.title} has ended`,
    }).catch(() => undefined);
  }

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

  const targetId = targetUserId?.trim() ?? "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
    return { error: "Invalid target user", status: 400 };
  }
  if (session.community_id) {
    const targetMember = await assertCommunityMember(targetId, session.community_id);
    if (!targetMember) return { error: "Target is not a community member", status: 403 };
  }

  const existing = await getParticipant(sessionId, targetId);
  if (
    existing &&
    existing.status === "joined" &&
    (existing.role === "host" || existing.role === "cohost" || existing.role === "speaker")
  ) {
    return { error: "Already on stage", status: 400 };
  }

  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: targetId,
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

  if (session.community_id) {
    const member = await assertCommunityMember(userId, session.community_id);
    if (!member) return { error: "Not a community member", status: 403 };
  }

  const existing = await getParticipant(sessionId, userId);
  if (!existing || existing.status === "left" || existing.status === "removed") {
    return { error: "Join the live session before requesting to speak", status: 403 };
  }
  if (existing.status === "rejected") {
    return { error: "Your previous request was declined", status: 403 };
  }
  if (existing.role === "host" || existing.role === "cohost" || existing.role === "speaker") {
    return { error: "Already on stage", status: 400 };
  }

  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      status: "requested",
      hand_raised: true,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId)
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

  const target = await getParticipant(sessionId, targetUserId);
  if (!target || (target.status !== "requested" && target.status !== "invited")) {
    return { error: "No pending speak request or invite", status: 400 };
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
  patch: Partial<Pick<LiveParticipantRow, "mic_on" | "cam_on" | "sharing">>
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "joined") return { error: "Not in session", status: 403 };

  // hand_raised is owned by requestSpeak / accept|reject — never via media patch.
  const safe: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.mic_on === "boolean") safe.mic_on = patch.mic_on;
  if (typeof patch.cam_on === "boolean") safe.cam_on = patch.cam_on;
  if (typeof patch.sharing === "boolean") safe.sharing = patch.sharing;

  const { data, error } = await db()
    .from("live_session_participants")
    .update(safe)
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

export async function setParticipantRole(
  sessionId: string,
  actorId: string,
  targetUserId: string,
  role: LiveStageRole
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  if (!["cohost", "moderator", "speaker", "viewer"].includes(role)) {
    return { error: "Invalid role", status: 400 };
  }
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const actor = await getParticipant(sessionId, actorId);
  const actorRole = actor?.role ?? (session.host_id === actorId ? "host" : "viewer");
  if (!canChangeRoles(actorRole) && session.host_id !== actorId) {
    return { error: "Only the host can change roles", status: 403 };
  }
  if (session.host_id === targetUserId) {
    return { error: "Cannot change host role — use transfer-host", status: 400 };
  }

  const target = await getParticipant(sessionId, targetUserId);
  if (!target || target.status !== "joined") {
    return { error: "Target is not in the session", status: 400 };
  }

  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Role update failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function transferHost(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ session: LiveSessionRow; participant: LiveParticipantRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  if (session.host_id !== actorId) {
    return { error: "Only the current host can transfer", status: 403 };
  }
  if (targetUserId === actorId) return { error: "Already host", status: 400 };

  const target = await getParticipant(sessionId, targetUserId);
  if (!target || target.status !== "joined") {
    return { error: "Target must be joined", status: 400 };
  }

  if (session.community_id) {
    const member = await assertCommunityMember(targetUserId, session.community_id);
    if (!member) return { error: "Target is not a community member", status: 403 };
  }

  const now = new Date().toISOString();
  const { data: updatedSession, error: sessionError } = await db()
    .from("live_sessions")
    .update({ host_id: targetUserId, updated_at: now })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (sessionError || !updatedSession) {
    return { error: sessionError?.message ?? "Transfer failed", status: 400 };
  }

  await db()
    .from("live_session_participants")
    .update({ role: "cohost", updated_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", actorId);

  const { data: participant, error: partError } = await db()
    .from("live_session_participants")
    .update({ role: "host", status: "joined", updated_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (partError || !participant) {
    return { error: partError?.message ?? "Transfer failed", status: 400 };
  }

  return {
    session: updatedSession as LiveSessionRow,
    participant: participant as LiveParticipantRow,
  };
}

export async function emitLiveReaction(
  sessionId: string,
  userId: string,
  emoji: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "joined") return { error: "Join the session first", status: 403 };

  const safeEmoji = emoji.trim().slice(0, 16);
  if (!safeEmoji) return { error: "Emoji required", status: 400 };

  const { error } = await db().from("live_session_signals").insert({
    session_id: sessionId,
    from_user_id: userId,
    to_user_id: null,
    signal_type: "reaction",
    payload: { emoji: safeEmoji },
  });
  if (error) return { error: error.message, status: 400 };

  await db()
    .from("live_sessions")
    .update({
      engagement_events: (session.engagement_events ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return { ok: true };
}

export async function updateLiveChatSettings(
  sessionId: string,
  userId: string,
  chatSettings: LiveChatSettings
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (role !== "host" && role !== "cohost" && role !== "moderator") {
    return { error: "Not allowed", status: 403 };
  }

  const prev = (session.settings ?? {}) as Record<string, unknown>;
  const next = {
    ...prev,
    ...normalizeChatSettings(chatSettings),
  };

  const { data, error } = await db()
    .from("live_sessions")
    .update({ settings: next, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { session: data as LiveSessionRow };
}

export function sessionDurationSeconds(session: LiveSessionRow): number {
  if (!session.started_at) return 0;
  const end = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  return Math.max(0, Math.floor((end - new Date(session.started_at).getTime()) / 1000));
}

export function averageViewers(session: LiveSessionRow): number {
  const n = session.viewer_sample_count ?? 0;
  if (n <= 0) return session.viewer_count ?? 0;
  return Math.round((session.viewer_sample_sum ?? 0) / n);
}

export async function getActiveLiveForSpace(spaceId: string) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "live")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as LiveSessionRow | null) ?? null;
}

export async function listLiveHistoryForCommunity(communityId: string, limit = 12) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("community_id", communityId)
    .eq("status", "ended")
    .order("ended_at", { ascending: false })
    .limit(limit);
  return (data as LiveSessionRow[]) ?? [];
}

export async function listLiveHistoryForSpace(spaceId: string, limit = 12) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("space_id", spaceId)
    .eq("status", "ended")
    .order("ended_at", { ascending: false })
    .limit(limit);
  return (data as LiveSessionRow[]) ?? [];
}

export async function listSessionRecordings(sessionId: string) {
  const { data } = await db()
    .from("live_recordings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return data ?? [];
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

/** Upcoming scheduled lives for a community (permission-agnostic list; caller ACL). */
export async function listScheduledLivesForCommunity(communityId: string, limit = 6) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("community_id", communityId)
    .eq("status", "scheduled")
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  return (data as LiveSessionRow[]) ?? [];
}

/** Most recent ended session (for replay / post-live continuity). */
export async function getLatestEndedLiveForCommunity(communityId: string) {
  const { data } = await db()
    .from("live_sessions")
    .select("*")
    .eq("community_id", communityId)
    .eq("status", "ended")
    .order("ended_at", { ascending: false })
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
