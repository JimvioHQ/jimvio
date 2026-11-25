import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyUser } from "@/lib/notifications/notify-user";
import {
  canViewEventRecord,
  EVENT_STATUSES,
  isDiscoverableEvent,
  validateEventDraft,
  type EventDraftInput,
  type EventStatus,
} from "@/lib/community/event-rules";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";

function admin() {
  return createServiceRoleClient() as any;
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createInviteToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashInviteToken(token) };
}

const MANAGE_ROLES = ["owner", "admin", "moderator"];

async function communityAccess(userId: string, communityId: string) {
  const supabase = await createClient();
  const [{ data: membership }, { data: community }] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("role, status")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase.from("communities").select("id, owner_id, name, slug, visibility").eq("id", communityId).maybeSingle(),
  ]);
  const role = String(membership?.role ?? "");
  const isOwner = community?.owner_id === userId;
  const canManage = isOwner || MANAGE_ROLES.includes(role);
  return { community, membership, canManage, isMember: Boolean(membership) || isOwner };
}

export async function assertCanManageEvent(userId: string, eventId: string) {
  const { data: event } = await admin().from("community_events").select("*").eq("id", eventId).maybeSingle();
  if (!event) throw new Error("Event not found");
  const access = await communityAccess(userId, event.community_id);
  const canManage = access.canManage || event.created_by === userId;
  if (!canManage) throw new Error("Not authorized to manage this event");
  return { event, access };
}

function publicEventShape(event: any, extra: Record<string, unknown> = {}) {
  const community = event.communities ?? null;
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start_date: event.starts_at,
    end_date: event.ends_at,
    timezone: event.timezone ?? "UTC",
    location: event.venue || event.location || (event.format === "online" || event.is_online ? "Online" : null),
    venue: event.venue ?? null,
    image_url: event.image_url,
    attendee_count: Number(event.rsvp_count ?? 0),
    kind: event.kind,
    format: event.format ?? (event.is_online ? "online" : "in_person"),
    visibility: event.visibility ?? "public",
    status: event.status ?? (event.is_published ? "published" : "draft"),
    capacity: event.capacity,
    host_name: event.host_name,
    tags: event.tags ?? [],
    registration_required: event.registration_required !== false,
    community_name: community?.name ?? event.community_name ?? null,
    community_slug: community?.slug ?? event.community_slug ?? null,
    href: `/communities/events/${event.id}`,
    source: "event" as const,
    ...extra,
  };
}

export async function listDiscoverableEvents(input: {
  userId: string;
  q?: string;
  filter?: string;
  kind?: string;
  cursor?: number;
  limit?: number;
  communitySlug?: string;
}) {
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 24);
  const offset = Math.max(input.cursor ?? 0, 0);
  const filter = input.filter || "upcoming";
  const now = new Date().toISOString();
  const eventSelect = input.communitySlug
    ? "*, communities!inner(name, slug, visibility)"
    : "*, communities(name, slug, visibility)";

  let query = admin()
    .from("community_events")
    .select(eventSelect, { count: "exact" })
    .eq("visibility", "public")
    .eq("status", "published");

  if (filter === "past" || filter === "completed") {
    query = query.lt("starts_at", now).order("starts_at", { ascending: false });
  } else if (filter === "organized") {
    query = admin()
      .from("community_events")
      .select(eventSelect, { count: "exact" })
      .eq("created_by", input.userId)
      .order("starts_at", { ascending: false });
  } else if (filter === "registered") {
    const { data: rsvps, error: rsvpError } = await admin()
      .from("community_event_rsvps")
      .select("event_id")
      .eq("user_id", input.userId)
      .eq("status", "going")
      .limit(200);
    if (rsvpError) {
      logCommunityFailure("events.registered-rsvps", rsvpError);
      throw new Error(publicErrorMessage(rsvpError, "Could not load registered events"));
    }
    const ids = (rsvps ?? []).map((row: { event_id: string }) => row.event_id);
    if (!ids.length) return { events: [], nextCursor: null };
    query = admin()
      .from("community_events")
      .select(eventSelect, { count: "exact" })
      .in("id", ids)
      .order("starts_at", { ascending: true });
  } else {
    query = query.gte("starts_at", now).order("starts_at", { ascending: true });
  }

  if (input.communitySlug) query = query.eq("communities.slug", input.communitySlug);
  if (input.kind) query = query.eq("kind", input.kind);
  if (input.q) {
    const q = input.q.replace(/[%_,]/g, "").slice(0, 80);
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) {
    logCommunityFailure("events.discover", error);
    throw new Error(publicErrorMessage(error, "Could not load events"));
  }

  const rows = (data ?? []).filter((event: any) => {
    if (filter === "organized" || filter === "registered") return true;
    return isDiscoverableEvent(event);
  });
  const filtered = rows;

  const ids = filtered.map((event: any) => event.id);
  const rsvpMap = new Map<string, string>();
  if (ids.length) {
    const { data: rsvps, error: rsvpError } = await admin()
      .from("community_event_rsvps")
      .select("event_id, status")
      .eq("user_id", input.userId)
      .in("event_id", ids);
    if (rsvpError) {
      logCommunityFailure("events.rsvp-status", rsvpError);
      throw new Error(publicErrorMessage(rsvpError, "Could not load event registrations"));
    }
    for (const row of rsvps ?? []) rsvpMap.set(row.event_id, row.status);
  }

  return {
    events: filtered.map((event: any) =>
      publicEventShape(event, {
        is_going: rsvpMap.get(event.id) === "going",
        is_interested: rsvpMap.get(event.id) === "interested",
        registration_status: rsvpMap.get(event.id) ?? null,
      }),
    ),
    nextCursor: (data ?? []).length === limit ? offset + limit : null,
  };
}

export async function saveCommunityEvent(input: {
  userId: string;
  eventId?: string | null;
  communityId: string;
  draft: EventDraftInput;
}) {
  const parsed = validateEventDraft(input.draft);
  if (!parsed.ok) throw new Error(parsed.error);
  let communityId = input.communityId;
  if (input.eventId && !communityId) {
    const { data: existing } = await admin().from("community_events").select("community_id").eq("id", input.eventId).maybeSingle();
    communityId = existing?.community_id;
  }
  if (!communityId) throw new Error("Community is required");
  const access = await communityAccess(input.userId, communityId);
  if (!access.canManage) throw new Error("Only owners and moderators can manage events");
  const value = parsed.value;
  let existingEvent: { invite_token_hash?: string | null } | null = null;
  if (input.eventId) {
    const managed = await assertCanManageEvent(input.userId, input.eventId);
    existingEvent = managed.event;
  }
  const needsInvite = value.visibility === "private" && !existingEvent?.invite_token_hash;
  const invite = needsInvite ? createInviteToken() : null;
  const inviteExpires = invite ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString() : null;
  const row = {
    community_id: communityId,
    title: value.title,
    description: value.description ?? null,
    kind: value.kind,
    location: value.location ?? null,
    venue: value.venue ?? null,
    is_online: value.format !== "in_person",
    format: value.format,
    meeting_url: value.meetingUrl ?? null,
    image_url: value.imageUrl ?? null,
    starts_at: value.startsAt,
    ends_at: value.endsAt ?? null,
    timezone: value.timezone,
    capacity: value.capacity ?? null,
    visibility: value.visibility,
    status: value.status,
    is_published: value.status === "published",
    tags: value.tags ?? [],
    host_name: value.hostName ?? null,
    registration_required: input.draft ? true : true,
    updated_at: new Date().toISOString(),
  };

  if (input.eventId) {
    const patch: Record<string, unknown> = { ...row };
    delete patch.community_id;
    if (invite) {
      patch.invite_token = invite.token;
      patch.invite_token_hash = invite.hash;
      patch.invite_expires_at = inviteExpires;
    }
    if (value.visibility === "public") {
      patch.invite_token = null;
      patch.invite_token_hash = null;
      patch.invite_expires_at = null;
      await admin()
        .from("community_event_invites")
        .update({ revoked_at: new Date().toISOString() })
        .eq("event_id", input.eventId)
        .is("revoked_at", null);
    }
    const { data, error } = await admin().from("community_events").update(patch).eq("id", input.eventId).select("*").single();
    if (error) throw error;
    if (invite) {
      await admin().from("community_event_invites").insert({
        event_id: data.id,
        token_hash: invite.hash,
        created_by: input.userId,
        expires_at: inviteExpires,
      });
    }
    return { event: data, inviteToken: invite?.token ?? null };
  }

  const { data, error } = await admin()
    .from("community_events")
    .insert({
      ...row,
      created_by: input.userId,
      invite_token: invite?.token ?? null,
      invite_token_hash: invite?.hash ?? null,
      invite_expires_at: inviteExpires,
    })
    .select("*")
    .single();
  if (error) throw error;
  if (invite) {
    await admin().from("community_event_invites").insert({
      event_id: data.id,
      token_hash: invite.hash,
      created_by: input.userId,
      expires_at: data.invite_expires_at,
    });
  }
  return { event: data, inviteToken: invite?.token ?? null };
}

export async function setEventLifecycle(input: {
  userId: string;
  eventId: string;
  status: EventStatus;
}) {
  if (!EVENT_STATUSES.includes(input.status)) {
    throw new Error("Invalid event status");
  }
  const { event } = await assertCanManageEvent(input.userId, input.eventId);
  const { data, error } = await admin()
    .from("community_events")
    .update({
      status: input.status,
      is_published: input.status === "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", event.id)
    .select("*")
    .single();
  if (error) throw error;
  if (input.status === "cancelled" || input.status === "completed") {
    await notifyRsvps(event.id, {
      title: input.status === "cancelled" ? "Event cancelled" : "Event completed",
      message: `${event.title} is now ${input.status}.`,
      actionUrl: `/communities/events/${event.id}`,
    });
  }
  return data;
}

export async function rotateEventInvite(input: { userId: string; eventId: string; revoke?: boolean }) {
  const { event } = await assertCanManageEvent(input.userId, input.eventId);
  if (input.revoke) {
    await admin()
      .from("community_event_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("event_id", event.id)
      .is("revoked_at", null);
    await admin()
      .from("community_events")
      .update({ invite_token: null, invite_token_hash: null, invite_expires_at: null })
      .eq("id", event.id);
    return { inviteToken: null, revoked: true };
  }
  const invite = createInviteToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await admin()
    .from("community_event_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("event_id", event.id)
    .is("revoked_at", null);
  await admin().from("community_event_invites").insert({
    event_id: event.id,
    token_hash: invite.hash,
    created_by: input.userId,
    expires_at: expires,
  });
  await admin()
    .from("community_events")
    .update({ invite_token: invite.token, invite_token_hash: invite.hash, invite_expires_at: expires })
    .eq("id", event.id);
  return { inviteToken: invite.token, revoked: false, expiresAt: expires };
}

async function inviteIsValid(eventId: string, token: string | null | undefined) {
  if (!token) return false;
  const hash = hashInviteToken(token);
  const { data } = await admin()
    .from("community_event_invites")
    .select("id, expires_at, revoked_at")
    .eq("event_id", eventId)
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return false;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return false;
  return true;
}

export async function getEventForViewer(input: { userId: string; eventId: string; token?: string | null }) {
  const { data: event } = await admin()
    .from("community_events")
    .select("*, communities(name, slug, visibility, owner_id)")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event) return null;
  const access = await communityAccess(input.userId, event.community_id);
  const canManage = access.canManage || event.created_by === input.userId;
  const invited = event.visibility === "private" ? await inviteIsValid(event.id, input.token) : false;
  const { data: rsvp } = await admin()
    .from("community_event_rsvps")
    .select("status")
    .eq("event_id", event.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (
    !canViewEventRecord({
      visibility: event.visibility,
      status: event.status,
      is_published: event.is_published,
      canManage,
      invited,
      rsvpStatus: rsvp?.status,
    })
  ) {
    return null;
  }

  const shape = publicEventShape(event, {
    is_going: rsvp?.status === "going",
    registration_status: rsvp?.status ?? null,
    can_manage: canManage,
    meeting_url: canManage || rsvp?.status === "going" || invited ? event.meeting_url : null,
    registration_questions: canManage || isDiscoverableEvent(event) || invited ? event.registration_questions ?? [] : [],
  });
  if (!canManage) {
    return shape;
  }
  return {
    ...shape,
    invite_token: event.visibility === "private" ? event.invite_token : null,
    invite_expires_at: event.invite_expires_at,
    description_full: event.description,
  };
}

export async function registerForEvent(input: {
  userId: string;
  eventId: string;
  status: "going" | "interested" | "declined";
  token?: string | null;
  answers?: Record<string, string> | null;
}) {
  const event = await getEventForViewer(input);
  if (!event) throw new Error("Event not found");
  const raw = await admin().from("community_events").select("*").eq("id", input.eventId).single();
  const record = raw.data;
  if (!record || record.status !== "published") throw new Error("Registration is closed for this event.");
  if (input.status === "going" && record.capacity) {
    const { count } = await admin()
      .from("community_event_rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", record.id)
      .eq("status", "going")
      .neq("user_id", input.userId);
    if ((count ?? 0) >= Number(record.capacity)) throw new Error("This event is at capacity.");
  }
  const { data: existing } = await admin()
    .from("community_event_rsvps")
    .select("id, status")
    .eq("event_id", record.id)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (existing?.status === "going" && input.status === "going") {
    return { duplicate: true, status: "going" };
  }
  const { data, error } = await admin()
    .from("community_event_rsvps")
    .upsert(
      {
        event_id: record.id,
        user_id: input.userId,
        status: input.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" },
    )
    .select("status")
    .single();
  if (error) throw error;
  if (input.status === "going") {
    await notifyUser(admin(), {
      userId: input.userId,
      type: "community",
      title: "You're registered",
      message: `Your registration for ${record.title} is confirmed.`,
      actionUrl: `/communities/events/${record.id}`,
      eventKey: `event-rsvp-${record.id}-${input.userId}`,
      category: "system",
    });
  }
  return { duplicate: false, status: data.status, answersStored: Boolean(input.answers) };
}

export async function announceEventUpdate(input: { userId: string; eventId: string; message: string }) {
  const { event } = await assertCanManageEvent(input.userId, input.eventId);
  const message = input.message.trim();
  if (message.length < 3 || message.length > 500) throw new Error("Update must be between 3 and 500 characters.");
  await notifyRsvps(event.id, {
    title: `Update: ${event.title}`,
    message,
    actionUrl: `/communities/events/${event.id}`,
  });
  return { ok: true };
}

async function notifyRsvps(eventId: string, notice: { title: string; message: string; actionUrl: string }) {
  const { data: rows } = await admin()
    .from("community_event_rsvps")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "going")
    .limit(500);
  await Promise.all(
    (rows ?? []).map((row: { user_id: string }) =>
      notifyUser(admin(), {
        userId: row.user_id,
        type: "community",
        title: notice.title,
        message: notice.message,
        actionUrl: notice.actionUrl,
        category: "system",
        eventKey: `event-update-${eventId}-${row.user_id}-${notice.title}`,
      }),
    ),
  );
}

export async function listEventRegistrations(input: { userId: string; eventId: string; cursor?: number }) {
  await assertCanManageEvent(input.userId, input.eventId);
  const offset = Math.max(input.cursor ?? 0, 0);
  const { data, error } = await admin()
    .from("community_event_rsvps")
    .select("id, user_id, status, created_at, profiles:user_id(full_name, username)")
    .eq("event_id", input.eventId)
    .order("created_at", { ascending: false })
    .range(offset, offset + 19);
  if (error) {
    const fallback = await admin()
      .from("community_event_rsvps")
      .select("id, user_id, status, created_at")
      .eq("event_id", input.eventId)
      .order("created_at", { ascending: false })
      .range(offset, offset + 19);
    if (fallback.error) throw fallback.error;
    return { registrations: fallback.data ?? [], nextCursor: (fallback.data ?? []).length === 20 ? offset + 20 : null };
  }
  return { registrations: data ?? [], nextCursor: (data ?? []).length === 20 ? offset + 20 : null };
}
