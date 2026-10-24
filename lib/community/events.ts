/**
 * Community events + RSVP helpers for Creator OS calendar.
 */

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";

export type CommunityEventKind =
  | "workshop"
  | "webinar"
  | "ama"
  | "meetup"
  | "launch"
  | "other";

export type CommunityEventRow = {
  id: string;
  community_id: string;
  created_by: string;
  title: string;
  description: string | null;
  kind: CommunityEventKind;
  location: string | null;
  is_online: boolean;
  meeting_url: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  rsvp_count: number;
  is_published: boolean;
  communities?: { name: string; slug: string } | null;
};

function db() {
  return createServiceRoleClient() as any;
}

export async function listHubCommunityEvents(userId: string) {
  const supabase = await createClient();
  const { data: memberships, error: membershipError } = await supabase
    .from("community_memberships")
    .select("community_id")
    .eq("user_id", userId)
    .eq("status", "active");
  if (membershipError) {
    logCommunityFailure("events.memberships", membershipError);
    throw new Error(publicErrorMessage(membershipError, "Could not load events"));
  }
  const communityIds = (memberships ?? []).map((m) => m.community_id);
  if (communityIds.length === 0) return [];

  const { data: events, error } = await db()
    .from("community_events")
    .select(
      "id, community_id, created_by, title, description, kind, location, is_online, meeting_url, image_url, starts_at, ends_at, capacity, rsvp_count, is_published, communities(name, slug)"
    )
    .in("community_id", communityIds)
    .eq("is_published", true)
    .eq("visibility", "public")
    .eq("status", "published")
    .order("starts_at", { ascending: true })
    .limit(80);
  if (error) {
    logCommunityFailure("events.hub", error);
    throw new Error(publicErrorMessage(error, "Could not load events"));
  }

  const eventIds = (events ?? []).map((e: CommunityEventRow) => e.id);
  let rsvpMap = new Map<string, string>();
  if (eventIds.length) {
    const { data: rsvps } = await db()
      .from("community_event_rsvps")
      .select("event_id, status")
      .eq("user_id", userId)
      .in("event_id", eventIds);
    for (const r of rsvps ?? []) {
      rsvpMap.set(r.event_id, r.status);
    }
  }

  return (events ?? []).map((e: CommunityEventRow) => {
    const community = e.communities;
    const status = rsvpMap.get(e.id);
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      start_date: e.starts_at,
      end_date: e.ends_at,
      location: e.location ?? (e.is_online ? "Online" : null),
      image_url: e.image_url,
      attendee_count: Number(e.rsvp_count ?? 0),
      is_going: status === "going",
      is_interested: status === "interested",
      kind: e.kind,
      href: community?.slug
        ? `/communities/events?community=${encodeURIComponent(community.slug)}&event=${e.id}`
        : `/communities/events?event=${e.id}`,
      community_name: community?.name ?? null,
      community_slug: community?.slug ?? null,
      meeting_url: e.meeting_url,
      capacity: e.capacity,
      source: "event" as const,
    };
  });
}

export async function listCommunityEventsForOwner(
  userId: string,
  communityId: string,
) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id, slug, name")
    .eq("id", communityId)
    .maybeSingle();

  const canManage =
    community?.owner_id === userId ||
    ["owner", "admin", "moderator"].includes(String(membership?.role ?? ""));
  if (!canManage) throw new Error("Not authorized to manage events");

  const { data: events, error } = await db()
    .from("community_events")
    .select(
      "id, community_id, created_by, title, description, kind, location, venue, is_online, format, visibility, status, timezone, meeting_url, image_url, starts_at, ends_at, capacity, rsvp_count, is_published, invite_token",
    )
    .eq("community_id", communityId)
    .order("starts_at", { ascending: true })
    .limit(200);
  if (error) throw error;

  return (events ?? []).map((e: CommunityEventRow) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    start_date: e.starts_at,
    end_date: e.ends_at,
    location: e.location ?? (e.is_online ? "Online" : null),
    image_url: e.image_url,
    attendee_count: Number(e.rsvp_count ?? 0),
    kind: e.kind,
    format: (e as { format?: string }).format ?? (e.is_online ? "online" : "in_person"),
    visibility: (e as { visibility?: string }).visibility ?? "public",
    status: (e as { status?: string }).status ?? (e.is_published ? "published" : "draft"),
    timezone: (e as { timezone?: string }).timezone ?? "UTC",
    is_published: e.is_published,
    meeting_url: e.meeting_url,
    invite_token: (e as { invite_token?: string | null }).invite_token ?? null,
    capacity: e.capacity,
    community_name: community?.name ?? null,
    community_slug: community?.slug ?? null,
    source: "event" as const,
  }));
}

export async function updateCommunityEvent(input: {
  userId: string;
  eventId: string;
  title?: string;
  description?: string | null;
  kind?: CommunityEventKind;
  location?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  imageUrl?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  capacity?: number | null;
  isPublished?: boolean;
}) {
  const { data: event } = await db()
    .from("community_events")
    .select("id, community_id, created_by")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event) throw new Error("Event not found");

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", event.community_id)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .maybeSingle();
  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", event.community_id)
    .maybeSingle();

  const canManage =
    community?.owner_id === input.userId ||
    event.created_by === input.userId ||
    ["owner", "admin", "moderator"].includes(String(membership?.role ?? ""));
  if (!canManage) throw new Error("Not authorized to update this event");

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title != null) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.kind != null) patch.kind = input.kind;
  if (input.location !== undefined) patch.location = input.location?.trim() || null;
  if (input.isOnline != null) patch.is_online = input.isOnline;
  if (input.meetingUrl !== undefined) patch.meeting_url = input.meetingUrl?.trim() || null;
  if (input.imageUrl !== undefined) patch.image_url = input.imageUrl?.trim() || null;
  if (input.startsAt != null) patch.starts_at = input.startsAt;
  if (input.endsAt !== undefined) patch.ends_at = input.endsAt;
  if (input.capacity !== undefined) patch.capacity = input.capacity;
  if (input.isPublished != null) patch.is_published = input.isPublished;

  const { data, error } = await db()
    .from("community_events")
    .update(patch)
    .eq("id", input.eventId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCommunityEvent(input: {
  userId: string;
  eventId: string;
}) {
  const { data: event } = await db()
    .from("community_events")
    .select("id, community_id, created_by")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event) throw new Error("Event not found");

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", event.community_id)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .maybeSingle();
  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", event.community_id)
    .maybeSingle();

  const canManage =
    community?.owner_id === input.userId ||
    event.created_by === input.userId ||
    ["owner", "admin", "moderator"].includes(String(membership?.role ?? ""));
  if (!canManage) throw new Error("Not authorized to delete this event");

  const { error } = await db()
    .from("community_events")
    .delete()
    .eq("id", input.eventId);
  if (error) throw error;
  return { ok: true };
}

export async function createCommunityEvent(input: {
  userId: string;
  communityId: string;
  title: string;
  description?: string | null;
  kind?: CommunityEventKind;
  location?: string | null;
  isOnline?: boolean;
  meetingUrl?: string | null;
  imageUrl?: string | null;
  startsAt: string;
  endsAt?: string | null;
  capacity?: number | null;
}) {
  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", input.communityId)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .maybeSingle();

  const { data: community } = await supabase
    .from("communities")
    .select("owner_id")
    .eq("id", input.communityId)
    .maybeSingle();

  const canCreate =
    community?.owner_id === input.userId ||
    ["owner", "admin", "moderator"].includes(String(membership?.role ?? ""));
  if (!canCreate) throw new Error("Only owners and moderators can create events");

  const { data, error } = await db()
    .from("community_events")
    .insert({
      community_id: input.communityId,
      created_by: input.userId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      kind: input.kind ?? "meetup",
      location: input.location?.trim() || null,
      is_online: input.isOnline ?? true,
      meeting_url: input.meetingUrl?.trim() || null,
      image_url: input.imageUrl?.trim() || null,
      starts_at: input.startsAt,
      ends_at: input.endsAt ?? null,
      capacity: input.capacity ?? null,
      is_published: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function setEventRsvp(input: {
  userId: string;
  eventId: string;
  status: "going" | "interested" | "declined";
}) {
  const { data: event } = await db()
    .from("community_events")
    .select("id, community_id, is_published")
    .eq("id", input.eventId)
    .maybeSingle();
  if (!event?.is_published) throw new Error("Event not found");

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("community_memberships")
    .select("id")
    .eq("community_id", event.community_id)
    .eq("user_id", input.userId)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) throw new Error("Join the community to RSVP");

  const { data, error } = await db()
    .from("community_event_rsvps")
    .upsert(
      {
        event_id: input.eventId,
        user_id: input.userId,
        status: input.status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
