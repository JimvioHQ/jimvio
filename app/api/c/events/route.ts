import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHubEvents } from "@/services/community/hub-data";
import {
  createCommunityEvent,
  listHubCommunityEvents,
  setEventRsvp,
  type CommunityEventKind,
} from "@/lib/community/events";

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

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const communitySlug = req.nextUrl.searchParams.get("community")?.trim() || "";

  const [legacy, native] = await Promise.all([
    communitySlug ? Promise.resolve([]) : getHubEvents(user.id),
    listHubCommunityEvents(user.id).catch(() => []),
  ]);

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
      const rsvp = await setEventRsvp({
        userId: user.id,
        eventId: String(body.eventId ?? ""),
        status: body.status === "interested" || body.status === "declined" ? body.status : "going",
      });
      return NextResponse.json({ ok: true, rsvp });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "RSVP failed" },
        { status: 400 }
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
    const event = await createCommunityEvent({
      userId: user.id,
      communityId,
      title,
      description: body.description ?? null,
      kind,
      location: body.location ?? null,
      isOnline: body.isOnline !== false,
      meetingUrl: body.meetingUrl ?? null,
      imageUrl: body.imageUrl ?? null,
      startsAt,
      endsAt: body.endsAt ?? null,
      capacity: body.capacity != null ? Number(body.capacity) : null,
    });
    return NextResponse.json({ ok: true, event });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create event" },
      { status: 400 }
    );
  }
}
