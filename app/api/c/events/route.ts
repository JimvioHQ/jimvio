import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubEvents } from "@/services/community/hub-data";
import {
  announceEventUpdate,
  listDiscoverableEvents,
  registerForEvent,
  rotateEventInvite,
  saveCommunityEvent,
  setEventLifecycle,
} from "@/lib/community/event-access";
import {
  deleteCommunityEvent,
  listCommunityEventsForOwner,
  listHubCommunityEvents,
  type CommunityEventKind,
} from "@/lib/community/events";
import { logCommunityFailure, publicErrorMessage } from "@/lib/community/public-error";

export const dynamic = "force-dynamic";

const KINDS = new Set<CommunityEventKind>([
  "workshop",
  "webinar",
  "ama",
  "meetup",
  "launch",
  "other",
]);

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const communitySlug = req.nextUrl.searchParams.get("community")?.trim() || "";
  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() || "";
  const manage = req.nextUrl.searchParams.get("manage") === "1";
  const discover = req.nextUrl.searchParams.get("discover") === "1";
  const filter = req.nextUrl.searchParams.get("filter") ?? undefined;

  // Public discovery exposes only published public events. Personal and
  // management views remain authenticated.
  if (!user && (!discover || filter === "organized" || filter === "registered" || manage)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (discover) {
    try {
      const result = await listDiscoverableEvents({
        userId: user?.id ?? "",
        q: req.nextUrl.searchParams.get("q") ?? undefined,
        filter,
        kind: req.nextUrl.searchParams.get("kind") ?? undefined,
        cursor: Number(req.nextUrl.searchParams.get("cursor") ?? 0),
        communitySlug,
      });
      return NextResponse.json(result);
    } catch (error) {
      logCommunityFailure("events.discover", error);
      return NextResponse.json(
        { error: publicErrorMessage(error, "Could not load events") },
        { status: 400 },
      );
    }
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (manage && communityId) {
    try {
      const events = await listCommunityEventsForOwner(user.id, communityId);
      return NextResponse.json({ events });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Forbidden" },
        { status: 403 },
      );
    }
  }

  let legacy: Awaited<ReturnType<typeof getHubEvents>> = [];
  let native: Awaited<ReturnType<typeof listHubCommunityEvents>> = [];
  try {
    [legacy, native] = await Promise.all([
      communitySlug ? Promise.resolve([]) : getHubEvents(user.id),
      listHubCommunityEvents(user.id),
    ]);
  } catch (error) {
    logCommunityFailure("events.list", error);
    return NextResponse.json(
      { error: publicErrorMessage(error, "Could not load events") },
      { status: 400 },
    );
  }

  const events = [
    ...native.filter((e: { community_slug?: string | null }) =>
      communitySlug ? e.community_slug === communitySlug : true
    ),
    ...legacy.map((e) => ({
      ...e,
      source: e.kind === "campaign" ? "campaign" : "task",
      is_interested: false,
      community_name: null,
      community_slug: null,
      meeting_url: null,
      capacity: null,
    })),
  ].sort(
    (a, b) =>
      new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.action === "rsvp") {
    try {
      const rsvp = await registerForEvent({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
        status: body.status === "interested" || body.status === "declined" ? body.status : "going",
        token: typeof body.token === "string" ? body.token : null,
      });
      return NextResponse.json({ ok: true, rsvp });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "RSVP failed" },
        { status: 400 }
      );
    }
  }

  if (body.action === "status") {
    try {
      const event = await setEventLifecycle({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
        status: body.status,
      });
      return NextResponse.json({ ok: true, event });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Update failed" },
        { status: 400 },
      );
    }
  }

  if (body.action === "invite") {
    try {
      const invite = await rotateEventInvite({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
        revoke: body.revoke === true,
      });
      return NextResponse.json({ ok: true, ...invite });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invite update failed" },
        { status: 400 },
      );
    }
  }

  if (body.action === "announce") {
    try {
      await announceEventUpdate({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
        message: String(body.message ?? ""),
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not send update" },
        { status: 400 },
      );
    }
  }
  if (body.action === "delete") {
    try {
      await deleteCommunityEvent({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
      });
      return NextResponse.json({ ok: true });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Delete failed" },
        { status: 400 },
      );
    }
  }

  if (body.action === "update") {
    const eventId = String(body.eventId ?? "");
    if (!eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 });
    }
    const kind = KINDS.has(body.kind) ? (body.kind as CommunityEventKind) : undefined;
    try {
      const saved = await saveCommunityEvent({
        userId: user.id,
        eventId,
        communityId: typeof body.communityId === "string" ? body.communityId : "",
        draft: {
          title: body.title,
          description: body.description,
          kind,
          format: body.format ?? (body.isOnline === false ? "in_person" : "online"),
          visibility: body.visibility,
          status: body.status ?? (body.isPublished === false ? "draft" : body.isPublished ? "published" : undefined),
          timezone: body.timezone,
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          meetingUrl: body.meetingUrl,
          location: body.location,
          venue: body.venue,
          capacity: body.capacity != null ? Number(body.capacity) : null,
          imageUrl: body.imageUrl,
          tags: Array.isArray(body.tags) ? body.tags : undefined,
          hostName: body.hostName,
        },
      });
      return NextResponse.json({ ok: true, event: saved.event, inviteToken: saved.inviteToken });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Update failed" },
        { status: 400 },
      );
    }
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const communityId = typeof body.communityId === "string" ? body.communityId : "";
  const startsAt = typeof body.startsAt === "string" ? body.startsAt : "";
  if (!title || !communityId || !startsAt) {
    return NextResponse.json(
      { error: "title, communityId, and startsAt are required" },
      { status: 400 }
    );
  }

  const kind = KINDS.has(body.kind) ? (body.kind as CommunityEventKind) : "meetup";

  try {
    const saved = await saveCommunityEvent({
      userId: user.id,
      communityId,
      draft: {
        title,
        description: body.description ?? null,
        kind,
        format: body.format ?? (body.isOnline === false ? "in_person" : "online"),
        visibility: body.visibility ?? "public",
        status: body.status ?? "published",
        timezone: body.timezone ?? "UTC",
        startsAt,
        endsAt: body.endsAt ?? null,
        meetingUrl: body.meetingUrl ?? null,
        location: body.location ?? null,
        venue: body.venue ?? null,
        capacity: body.capacity != null ? Number(body.capacity) : null,
        imageUrl: body.imageUrl ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        hostName: body.hostName ?? null,
      },
    });
    return NextResponse.json({ ok: true, event: saved.event, inviteToken: saved.inviteToken });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create event" },
      { status: 400 }
    );
  }
}
