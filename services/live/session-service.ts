import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { getUserMembership, isMembershipActive } from "@/services/communityService";
import { notifyCommunityLiveEvent } from "@/lib/community/notify-live";
import { liveStudioLog } from "@/lib/live/observability";
import type { LivePollPublic } from "@/lib/live/poll-types";
import { isCommunityUuid } from "@/lib/community/resolve-community";
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
import {
  canControlRoomStage,
  nextStageFocus,
  readStageFocus,
  type RoomStageFocus,
} from "@/lib/live/stage-selection";
import {
  mergeParticipantPermissions,
  parseParticipantPermissions,
  participantMediaPublishAllowed,
  serializeParticipantPermissions,
  type LiveParticipantPermissions,
} from "@/lib/live/participant-permissions";

export type LiveSessionPrivacy = "public" | "private" | "invite_only";

export type LiveChatSettings = {
  slow_mode_seconds?: number;
  /** Future-ready gate — not enforced until subscriptions product ships. */
  subscribers_only?: boolean;
  /** When false, viewers cannot send chat messages. */
  enabled?: boolean;
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
  updated_at?: string | null;
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
  /** Enriched from profiles — present on list/refresh payloads. */
  display_name?: string | null;
  avatar_url?: string | null;
  username?: string | null;
};

function db() {
  return createServiceRoleClient();
}

function writeFailed(
  action: string,
  error: { code?: string } | null | undefined,
  fallback: string
): { error: string; status: number } {
  liveStudioLog("error", "unhandled", {
    action,
    code: error?.code ?? null,
  });
  return { error: fallback, status: 400 };
}

function membershipChatBlock(
  membership: Awaited<ReturnType<typeof getUserMembership>>
): { error: string; status: number } | null {
  if (!membership) return null;
  const extra = membership as typeof membership & {
    muted_until?: string | null;
    timeout_until?: string | null;
    suspended_until?: string | null;
  };
  const now = Date.now();
  const blocked = (iso: string | null | undefined, label: string) => {
    if (!iso) return null;
    const at = new Date(iso).getTime();
    if (Number.isNaN(at) || at <= now) return null;
    return { error: `You are ${label} in this community.`, status: 403 };
  };
  return (
    blocked(extra.suspended_until, "suspended") ||
    blocked(extra.timeout_until, "in timeout") ||
    blocked(extra.muted_until, "muted")
  );
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

/** True when the user may view session metadata (member / owner / public live). */
export async function canViewLiveSession(
  userId: string,
  session: LiveSessionRow
): Promise<boolean> {
  const privacy = normalizePrivacy(session.privacy);
  if (privacy === "public") return true;
  if (session.host_id === userId) return true;

  const participant = await getParticipant(session.id, userId);
  if (
    participant &&
    (participant.status === "joined" ||
      participant.status === "invited" ||
      participant.status === "requested" ||
      participant.role === "cohost" ||
      participant.role === "speaker" ||
      participant.role === "moderator")
  ) {
    return true;
  }

  if (!session.community_id) return false;
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
  const rows = (data as LiveParticipantRow[]) ?? [];
  if (!rows.length) return rows;

  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  const profileMap = new Map<
    string,
    { full_name: string | null; avatar_url: string | null; username: string | null }
  >();
  if (userIds.length) {
    const { data: profiles } = await db()
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        username: p.username,
      });
    }
  }

  return rows.map((r) => {
    const profile = profileMap.get(r.user_id);
    return {
      ...r,
      display_name: profile?.full_name || profile?.username || null,
      avatar_url: profile?.avatar_url ?? null,
      username: profile?.username ?? null,
    };
  });
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
      enabled: raw?.enabled !== false,
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
    participants: serializeParticipantPermissions({
      allowAudio: true,
      allowVideo: true,
      allowScreenShare: true,
      allowRecording: true,
    }),
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

  void sweepStaleLiveSessions().catch(() => undefined);

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

  // Preserve pending speaker invites — accept-invite promotes them later.
  if (existing?.status === "invited") {
    return { participant: existing, session };
  }

  const settings = (session.settings ?? {}) as Record<string, unknown>;
  const waitingRoom = Boolean(settings.waiting_room);
  const participantPerms = parseParticipantPermissions(settings);
  const mediaAllowed = participantMediaPublishAllowed(participantPerms);

  /**
   * Role assignment:
   * - Preserve elevated roles (host/cohost/speaker/moderator) on rejoin.
   * - New joiners become speakers when the Host allows participant media
   *   so LiveKit canPublish is granted (participants ≠ passive viewers).
   * - Waiting-room joiners stay viewers until admitted.
   */
  let role: LiveStageRole =
    existing?.role &&
    existing.status !== "left" &&
    existing.status !== "rejected" &&
    existing.status !== "requested"
      ? existing.role
      : session.host_id === userId
        ? "host"
        : mediaAllowed
          ? "speaker"
          : "viewer";

  // Upgrade legacy joined viewers to speaker when Host allows participant media.
  if (
    existing?.status === "joined" &&
    existing.role === "viewer" &&
    session.host_id !== userId &&
    mediaAllowed
  ) {
    role = "speaker";
  }

  const alreadyJoined = existing?.status === "joined";
  let joinStatus: LiveParticipantStatus = "joined";
  if (
    waitingRoom &&
    session.host_id !== userId &&
    !alreadyJoined &&
    !(
      existing?.role === "cohost" ||
      existing?.role === "speaker" ||
      existing?.role === "moderator"
    )
  ) {
    joinStatus = "requested";
    role = "viewer";
  }

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_session_participants")
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        role,
        status: joinStatus,
        hand_raised: joinStatus === "requested" ? false : (existing?.hand_raised ?? false),
        left_at: null,
        joined_at:
          joinStatus === "joined"
            ? existing?.status === "joined"
              ? existing.joined_at
              : now
            : existing?.joined_at ?? null,
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

async function finalizeEndedSession(
  session: LiveSessionRow,
  actorId: string
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const { data: stillJoined } = await db()
    .from("live_session_participants")
    .select("joined_at")
    .eq("session_id", session.id)
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
    .eq("id", session.id)
    .eq("status", "live")
    .select("*")
    .single();

  if (error || !data) return writeFailed("live_end", error, "Unable to end this Live.");

  await db()
    .from("live_session_participants")
    .update({ status: "left", left_at: now, updated_at: now })
    .eq("session_id", session.id)
    .neq("status", "removed");

  // Stop multistream destinations without blocking Jimvio Live end.
  void import("@/lib/live/destinations/destination-manager")
    .then(({ stopAllDestinations }) =>
      stopAllDestinations({
        userId: session.host_id,
        liveSessionId: session.id,
        metadata: { title: session.title || "Jimvio Live" },
      })
    )
    .catch(() => undefined);

  const slug = await communitySlug(session.community_id);
  if (slug && session.community_id) {
    void notifyCommunityLiveEvent(db(), {
      communityId: session.community_id,
      actorId,
      communitySlug: slug,
      sessionId: session.id,
      event: "live_ended",
      title: "Live ended",
      message: `${session.title} has ended`,
    }).catch(() => undefined);
  }

  return { session: data as LiveSessionRow };
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

  return finalizeEndedSession(session, userId);
}

const STALE_LIVE_IDLE_MS = 90 * 60 * 1000;

/** End abandoned Lives (host gone, or no heartbeat for 90 minutes). */
export async function sweepStaleLiveSessions(): Promise<number> {
  const { data: lives } = await db()
    .from("live_sessions")
    .select("*")
    .eq("status", "live")
    .limit(40);

  let ended = 0;
  const now = Date.now();
  for (const raw of lives ?? []) {
    const session = raw as LiveSessionRow;
    const host = await getParticipant(session.id, session.host_id);
    const hostGone = host?.status === "left" || host?.status === "removed";

    const { data: latest } = await db()
      .from("live_session_participants")
      .select("updated_at")
      .eq("session_id", session.id)
      .eq("status", "joined")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivity = Math.max(
      session.updated_at ? new Date(session.updated_at).getTime() : 0,
      latest?.updated_at ? new Date(latest.updated_at).getTime() : 0
    );
    const started = session.started_at ? new Date(session.started_at).getTime() : 0;
    const idle =
      lastActivity > 0
        ? now - lastActivity >= STALE_LIVE_IDLE_MS
        : started > 0 && now - started >= STALE_LIVE_IDLE_MS;
    if (!hostGone && !idle) continue;

    const result = await finalizeEndedSession(session, session.host_id);
    if ("session" in result) {
      liveStudioLog("info", "session_end", {
        sessionId: session.id,
        userId: session.host_id,
        reason: hostGone ? "host_gone" : "stale_idle",
      });
      ended += 1;
    }
  }
  return ended;
}

export async function heartbeatLiveParticipant(
  sessionId: string,
  userId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { ok: true };
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "joined") return { ok: true };
  const now = new Date().toISOString();
  await db()
    .from("live_session_participants")
    .update({ updated_at: now })
    .eq("session_id", sessionId)
    .eq("user_id", userId);
  await db()
    .from("live_sessions")
    .update({ updated_at: now })
    .eq("id", sessionId)
    .eq("status", "live");
  return { ok: true };
}

export async function inviteSpeaker(
  sessionId: string,
  actorId: string,
  targetUserId: string,
  role: LiveStageRole = "speaker"
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

  const inviteRole: LiveStageRole =
    role === "cohost" || role === "moderator" || role === "speaker" || role === "viewer"
      ? role
      : "speaker";

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
        role: inviteRole,
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

export async function lowerHand(
  sessionId: string,
  userId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };

  const existing = await getParticipant(sessionId, userId);
  if (!existing || existing.status === "left" || existing.status === "removed") {
    return { error: "Join the live session first", status: 403 };
  }
  if (!existing.hand_raised && existing.status !== "requested") {
    return { participant: existing };
  }

  const nextStatus =
    existing.status === "requested" &&
    existing.role !== "host" &&
    existing.role !== "cohost" &&
    existing.role !== "speaker"
      ? "joined"
      : existing.status;

  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      status: nextStatus,
      hand_raised: false,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not lower hand", status: 400 };
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
      role:
        me.role === "cohost" || me.role === "moderator" || me.role === "speaker"
          ? me.role
          : "speaker",
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
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const actor = await getParticipant(sessionId, userId);
  if (!actor || !canLaunchPoll(actor.role)) return { error: "Not allowed", status: 403 };
  const cleanOptions = options
    .map((o) => o.trim())
    .filter(Boolean)
    .slice(0, 8);
  const q = question.trim().slice(0, 200);
  if (!q || cleanOptions.length < 2) {
    return { error: "Poll needs a question and at least 2 options", status: 400 };
  }

  const { data, error } = await db()
    .from("live_polls")
    .insert({
      session_id: sessionId,
      created_by: userId,
      question: q,
      options: cleanOptions,
      status: "active",
    })
    .select("*")
    .single();

  if (error || !data) return writeFailed("live_poll_create", error, "Unable to create poll.");
  return { poll: data };
}

export type { LivePollPublic } from "@/lib/live/poll-types";

function pollOptionLabels(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object" && "label" in item) {
        return String((item as { label: unknown }).label).trim();
      }
      return "";
    })
    .filter(Boolean);
}

export async function listLivePolls(
  sessionId: string,
  userId: string
): Promise<LivePollPublic[]> {
  const { data: polls } = await db()
    .from("live_polls")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (polls ?? []) as Array<{
    id: string;
    session_id: string;
    question: string;
    options: unknown;
    status: string;
    created_at: string;
    ended_at: string | null;
  }>;
  if (rows.length === 0) return [];

  const ids = rows.map((p) => p.id);
  const { data: votes } = await db()
    .from("live_poll_votes")
    .select("poll_id, user_id, option_index")
    .in("poll_id", ids);

  const count = new Map<string, number>();
  const mine = new Map<string, number>();
  for (const v of votes ?? []) {
    const key = `${v.poll_id}:${v.option_index}`;
    count.set(key, (count.get(key) ?? 0) + 1);
    if (v.user_id === userId) mine.set(v.poll_id, v.option_index);
  }

  return rows.map((p) => {
    const labels = pollOptionLabels(p.options);
    return {
      id: p.id,
      session_id: p.session_id,
      question: p.question,
      options: labels.map((label, i) => ({
        id: String(i),
        label,
        votes: count.get(`${p.id}:${i}`) ?? 0,
      })),
      status: p.status,
      created_at: p.created_at,
      ended_at: p.ended_at,
      my_option_index: mine.get(p.id) ?? null,
    };
  });
}

export async function voteLivePoll(
  sessionId: string,
  userId: string,
  pollId: string,
  optionIndex: number
): Promise<{ poll: LivePollPublic } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  if (!isCommunityUuid(pollId)) return { error: "Poll not found", status: 404 };
  const me = await getParticipant(sessionId, userId);
  if (!me || me.status !== "joined") return { error: "Join the session first", status: 403 };

  const idx = Number(optionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > 7) {
    return { error: "Invalid option", status: 400 };
  }

  const { data: poll } = await db()
    .from("live_polls")
    .select("*")
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!poll) return { error: "Poll not found", status: 404 };
  if (poll.status !== "active") return { error: "This poll is closed.", status: 400 };
  const labels = pollOptionLabels(poll.options);
  if (idx >= labels.length) return { error: "Invalid option", status: 400 };

  const { error } = await db().from("live_poll_votes").insert({
    poll_id: pollId,
    user_id: userId,
    option_index: idx,
  });
  if (error) {
    if (error.code === "23505") {
      return { error: "You already voted on this poll.", status: 409 };
    }
    return writeFailed("live_poll_vote", error, "Unable to record your vote.");
  }

  const list = await listLivePolls(sessionId, userId);
  const next = list.find((p) => p.id === pollId);
  if (!next) return { error: "Poll not found", status: 404 };
  return { poll: next };
}

export async function closeLivePoll(
  sessionId: string,
  userId: string,
  pollId: string
): Promise<{ poll: LivePollPublic } | { error: string; status: number }> {
  if (!isCommunityUuid(pollId)) return { error: "Poll not found", status: 404 };
  const actor = await getParticipant(sessionId, userId);
  if (!actor || !canLaunchPoll(actor.role)) return { error: "Not allowed", status: 403 };

  const now = new Date().toISOString();
  const { data, error } = await db()
    .from("live_polls")
    .update({ status: "closed", ended_at: now })
    .eq("id", pollId)
    .eq("session_id", sessionId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();
  if (error) return writeFailed("live_poll_close", error, "Unable to close poll.");
  if (!data) return { error: "Poll not found", status: 404 };

  const list = await listLivePolls(sessionId, userId);
  const next = list.find((p) => p.id === pollId);
  if (!next) return { error: "Poll not found", status: 404 };
  return { poll: next };
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
  if (error) return writeFailed("live_reaction", error, "Unable to send reaction.");

  await db()
    .from("live_sessions")
    .update({
      engagement_events: (session.engagement_events ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return { ok: true };
}

/** Admit a waiting-room viewer as a joined participant (speaker when media allowed). */
export async function admitViewer(
  sessionId: string,
  actorId: string,
  targetUserId: string
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canAcceptSpeaker(actor.role)) return { error: "Not allowed", status: 403 };

  const target = await getParticipant(sessionId, targetUserId);
  if (!target || target.status !== "requested") {
    return { error: "No one waiting", status: 400 };
  }

  const session = await getSession(sessionId);
  const perms = parseParticipantPermissions(
    (session?.settings ?? {}) as Record<string, unknown>
  );
  const admitRole: LiveStageRole = participantMediaPublishAllowed(perms)
    ? "speaker"
    : "viewer";

  const { data, error } = await db()
    .from("live_session_participants")
    .update({
      role: admitRole,
      status: "joined",
      hand_raised: false,
      updated_at: new Date().toISOString(),
      joined_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Admit failed", status: 400 };
  await syncViewerCount(sessionId);
  return { participant: data as LiveParticipantRow };
}

/** Admit every waiting-room participant (requested, not hand-raise). */
export async function admitAllWaiting(
  sessionId: string,
  actorId: string
): Promise<{ admitted: number } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || !canAcceptSpeaker(actor.role)) return { error: "Not allowed", status: 403 };

  const { data: waiting } = await db()
    .from("live_session_participants")
    .select("user_id")
    .eq("session_id", sessionId)
    .eq("status", "requested")
    .eq("hand_raised", false);

  const ids = (waiting ?? []).map((r) => r.user_id as string);
  if (ids.length === 0) return { admitted: 0 };

  const session = await getSession(sessionId);
  const perms = parseParticipantPermissions(
    (session?.settings ?? {}) as Record<string, unknown>
  );
  const admitRole: LiveStageRole = participantMediaPublishAllowed(perms)
    ? "speaker"
    : "viewer";

  const now = new Date().toISOString();
  const { error } = await db()
    .from("live_session_participants")
    .update({
      role: admitRole,
      status: "joined",
      hand_raised: false,
      joined_at: now,
      updated_at: now,
    })
    .eq("session_id", sessionId)
    .in("user_id", ids)
    .eq("status", "requested");

  if (error) return { error: error.message, status: 400 };
  await syncViewerCount(sessionId);
  return { admitted: ids.length };
}

export async function setWaitingRoomEnabled(
  sessionId: string,
  userId: string,
  enabled: boolean
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (role !== "host" && role !== "cohost") {
    return { error: "Not allowed", status: 403 };
  }

  const prev = (session.settings ?? {}) as Record<string, unknown>;
  const { data, error } = await db()
    .from("live_sessions")
    .update({
      settings: { ...prev, waiting_room: enabled },
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { session: data as LiveSessionRow };
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
  const prevChat = (prev.chat as Record<string, unknown> | undefined) ?? {};
  const merged: LiveChatSettings = {
    slow_mode_seconds:
      typeof chatSettings.slow_mode_seconds === "number"
        ? chatSettings.slow_mode_seconds
        : typeof prevChat.slow_mode_seconds === "number"
          ? (prevChat.slow_mode_seconds as number)
          : 0,
    subscribers_only:
      typeof chatSettings.subscribers_only === "boolean"
        ? chatSettings.subscribers_only
        : Boolean(prevChat.subscribers_only),
    enabled:
      typeof chatSettings.enabled === "boolean"
        ? chatSettings.enabled
        : prevChat.enabled !== false,
  };
  const next = {
    ...prev,
    ...normalizeChatSettings(merged),
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

/** Host/cohost updates participant capability policy (realtime via live_sessions). */
export async function updateParticipantPermissions(
  sessionId: string,
  userId: string,
  patch: Partial<LiveParticipantPermissions>
): Promise<{ session: LiveSessionRow; permissions: LiveParticipantPermissions } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (role !== "host" && role !== "cohost") {
    return { error: "Not allowed", status: 403 };
  }

  const prev = (session.settings ?? {}) as Record<string, unknown>;
  const current = parseParticipantPermissions(prev);
  const nextPerms = mergeParticipantPermissions(current, patch);
  const next = {
    ...prev,
    participants: serializeParticipantPermissions(nextPerms),
  };

  const { data, error } = await db()
    .from("live_sessions")
    .update({ settings: next, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { session: data as LiveSessionRow, permissions: nextPerms };
}

export type LiveStageFocus = RoomStageFocus;

/** Host or cohost promotes a participant camera or screen to the main stage. */
export async function updateStageFocus(
  sessionId: string,
  userId: string,
  focus: { identity: string | null; kind?: LiveStageFocus["kind"] }
): Promise<{ session: LiveSessionRow; stageFocus: LiveStageFocus } | { error: string; status: number }> {
  const session = await getSession(sessionId);
  if (!session || session.status !== "live") return { error: "Session not live", status: 400 };
  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (!canControlRoomStage(role)) {
    return { error: "Not allowed", status: 403 };
  }

  const identity =
    typeof focus.identity === "string" && focus.identity.trim()
      ? focus.identity.trim()
      : null;
  if (identity) {
    const target = await getParticipant(sessionId, identity);
    if (!target || target.status !== "joined") {
      return { error: "Participant not in session", status: 400 };
    }
  }

  const stageFocus = nextStageFocus({
    previous: readStageFocus(session.settings),
    identity,
    kind: focus.kind,
  });

  const prev = (session.settings ?? {}) as Record<string, unknown>;
  const next = {
    ...prev,
    stage_focus: stageFocus,
  };

  const { data, error } = await db()
    .from("live_sessions")
    .update({ settings: next, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { session: data as LiveSessionRow, stageFocus };
}

/** Host/cohost forces a participant's media flags (e.g. stop screen share). */
export async function forceParticipantMedia(
  sessionId: string,
  actorId: string,
  targetUserId: string,
  patch: Partial<Pick<LiveParticipantRow, "mic_on" | "cam_on" | "sharing">>
): Promise<{ participant: LiveParticipantRow } | { error: string; status: number }> {
  const actor = await getParticipant(sessionId, actorId);
  if (!actor || (actor.role !== "host" && actor.role !== "cohost")) {
    return { error: "Not allowed", status: 403 };
  }
  const session = await getSession(sessionId);
  if (session?.host_id === targetUserId && actorId !== targetUserId) {
    return { error: "Cannot force host media", status: 400 };
  }

  const safe: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof patch.mic_on === "boolean") safe.mic_on = patch.mic_on;
  if (typeof patch.cam_on === "boolean") safe.cam_on = patch.cam_on;
  if (typeof patch.sharing === "boolean") safe.sharing = patch.sharing;

  const { data, error } = await db()
    .from("live_session_participants")
    .update(safe)
    .eq("session_id", sessionId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Update failed", status: 400 };
  return { participant: data as LiveParticipantRow };
}

export async function updateLiveTitle(
  sessionId: string,
  userId: string,
  title: string
): Promise<{ session: LiveSessionRow } | { error: string; status: number }> {
  const trimmed = title.trim().slice(0, 120);
  if (trimmed.length < 2) {
    return { error: "Title must be at least 2 characters", status: 400 };
  }

  const session = await getSession(sessionId);
  if (!session) return { error: "Not found", status: 404 };
  if (session.status !== "live" && session.status !== "scheduled") {
    return { error: "Session is not editable", status: 400 };
  }

  const me = await getParticipant(sessionId, userId);
  const role = me?.role ?? (session.host_id === userId ? "host" : "viewer");
  if (role !== "host" && role !== "cohost") {
    return { error: "Only the host can edit the title", status: 403 };
  }

  const { data, error } = await db()
    .from("live_sessions")
    .update({ title: trimmed, updated_at: new Date().toISOString() })
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

export function toPublicLiveRecording(row: Record<string, unknown>) {
  const status = typeof row.status === "string" ? row.status : "unknown";
  const storageUrl =
    typeof row.cloudinary_url === "string" ? row.cloudinary_url : null;
  const ready = status === "ready" && Boolean(storageUrl);
  return {
    id: String(row.id ?? ""),
    status,
    cloudinary_url: storageUrl,
    thumbnail_url: typeof row.thumbnail_url === "string" ? row.thumbnail_url : null,
    duration_seconds: typeof row.duration_seconds === "number" ? row.duration_seconds : null,
    byte_size: typeof row.byte_size === "number" ? row.byte_size : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    ended_at: typeof row.ended_at === "string" ? row.ended_at : null,
    failed: status === "failed",
    error: typeof row.error === "string" ? row.error.slice(0, 300) : null,
    ready,
    file_type: ready ? "MP4" : null,
  };
}

export async function listSessionRecordings(sessionId: string) {
  const { data } = await db()
    .from("live_recordings")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row) => toPublicLiveRecording(row as Record<string, unknown>));
}

export async function listUserLiveRecordings(userId: string, limit = 40) {
  const { data } = await db()
    .from("live_recordings")
    .select("*, live_sessions(title)")
    .eq("started_by", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => {
    const base = toPublicLiveRecording(row as Record<string, unknown>);
    const session = (row as { live_sessions?: { title?: string | null } | null })
      .live_sessions;
    return {
      ...base,
      session_id: String((row as { session_id?: string }).session_id ?? ""),
      title:
        (typeof session?.title === "string" && session.title.trim()) ||
        "Live recording",
    };
  });
}

export async function getLiveRecordingForUser(recordingId: string, userId: string) {
  const { data } = await db()
    .from("live_recordings")
    .select("*, live_sessions(id, title, host_id, privacy)")
    .eq("id", recordingId)
    .maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown> & {
    started_by?: string;
    session_id?: string;
    live_sessions?: {
      id?: string;
      title?: string | null;
      host_id?: string;
      privacy?: string;
    } | null;
  };
  const session = row.live_sessions;
  const isOwner = row.started_by === userId;
  const isHost = session?.host_id === userId;
  if (!isOwner && !isHost) {
    const sessionRow = await getSession(String(row.session_id ?? ""));
    if (!sessionRow) return null;
    const allowed = await canViewLiveSession(userId, sessionRow);
    if (!allowed) return null;
  }
  return {
    ...toPublicLiveRecording(row),
    session_id: String(row.session_id ?? ""),
    title:
      (typeof session?.title === "string" && session.title.trim()) ||
      "Live recording",
  };
}

export async function deleteLiveRecordingForUser(
  recordingId: string,
  userId: string
): Promise<{ ok: true } | { error: string; status: number }> {
  const { data } = await db()
    .from("live_recordings")
    .select("id, started_by, session_id")
    .eq("id", recordingId)
    .maybeSingle();
  if (!data) return { error: "Not found", status: 404 };
  const session = await getSession(String(data.session_id));
  const isOwner = data.started_by === userId;
  const isHost = session?.host_id === userId;
  if (!isOwner && !isHost) {
    return { error: "Not allowed", status: 403 };
  }
  const { error } = await db().from("live_recordings").delete().eq("id", recordingId);
  if (error) return { error: error.message, status: 400 };
  return { ok: true };
}

export type LiveSessionChatMessage = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  is_pinned?: boolean;
  reply_to_id?: string | null;
  reply_to_body?: string | null;
  reply_to_sender?: string | null;
  reaction_count?: number;
};

export async function listLiveSessionMessages(
  sessionId: string,
  limit = 100,
  userId?: string
): Promise<LiveSessionChatMessage[]> {
  // live_session_messages exists in production (082 repair); not always in generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = db() as any;
  let q = client
    .from("live_session_messages")
    .select("id, body, created_at, user_id, metadata")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) q = q.eq("user_id", userId);

  const { data } = await q;
  const rows = (data ?? []) as Array<{
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    metadata?: Record<string, unknown> | null;
  }>;

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; username: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles } = await db()
      .from("profiles")
      .select("id, full_name, avatar_url, username")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, {
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        username: p.username,
      });
    }
  }

  return rows
    .slice()
    .reverse()
    .map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      const profile = profileMap.get(r.user_id);
      return {
        id: r.id,
        body: r.body,
        created_at: r.created_at,
        sender_id: r.user_id,
        sender_name: profile?.full_name || profile?.username || "Member",
        sender_avatar: profile?.avatar_url ?? null,
        is_pinned: Boolean(meta.is_pinned),
        reply_to_id: typeof meta.reply_to_id === "string" ? meta.reply_to_id : null,
        reply_to_body: typeof meta.reply_to_body === "string" ? meta.reply_to_body : null,
        reply_to_sender:
          typeof meta.reply_to_sender === "string" ? meta.reply_to_sender : null,
        reaction_count: typeof meta.reaction_count === "number" ? meta.reaction_count : 0,
      };
    });
}

export async function postLiveSessionMessage(input: {
  sessionId: string;
  userId: string;
  body: string;
  replyToId?: string | null;
  replyToBody?: string | null;
  replyToSender?: string | null;
}): Promise<{ message: LiveSessionChatMessage } | { error: string; status: number }> {
  const session = await getSession(input.sessionId);
  if (!session || session.status !== "live") {
    return { error: "The Live has ended.", status: 410 };
  }
  if (session.community_id) {
    const membership = await getUserMembership(input.userId, session.community_id);
    const blocked = membershipChatBlock(membership);
    if (blocked) return blocked;
  }

  const metadata: Record<string, unknown> = {};
  if (input.replyToId) {
    metadata.reply_to_id = input.replyToId;
    metadata.reply_to_body = (input.replyToBody ?? "").slice(0, 200);
    metadata.reply_to_sender = (input.replyToSender ?? "").slice(0, 120);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db() as any)
    .from("live_session_messages")
    .insert({
      session_id: input.sessionId,
      user_id: input.userId,
      body: input.body.slice(0, 4000),
      message_type: "text",
      metadata,
    })
    .select("id, body, created_at, user_id, metadata")
    .single();

  if (error || !data) {
    return writeFailed("live_chat_insert", error, "Unable to send message. Please try again.");
  }

  const { data: profile } = await db()
    .from("profiles")
    .select("full_name, avatar_url, username")
    .eq("id", input.userId)
    .maybeSingle();

  const meta = (data.metadata ?? {}) as Record<string, unknown>;
  return {
    message: {
      id: data.id,
      body: data.body,
      created_at: data.created_at,
      sender_id: data.user_id,
      sender_name: profile?.full_name || profile?.username || "Member",
      sender_avatar: profile?.avatar_url ?? null,
      is_pinned: Boolean(meta.is_pinned),
      reply_to_id: typeof meta.reply_to_id === "string" ? meta.reply_to_id : null,
      reply_to_body: typeof meta.reply_to_body === "string" ? meta.reply_to_body : null,
      reply_to_sender:
        typeof meta.reply_to_sender === "string" ? meta.reply_to_sender : null,
      reaction_count: 0,
    },
  };
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
