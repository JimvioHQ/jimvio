import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifyUser } from "@/lib/notifications/notify-user";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

const REQUEST_TYPES = new Set(["booking", "collaboration", "service", "business", "general"]);

const REQUEST_TYPE_LABEL: Record<string, string> = {
  booking: "Booking",
  collaboration: "Collaboration",
  service: "Service inquiry",
  business: "Business inquiry",
  general: "General contact",
};

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/**
 * GET /api/identity/bookings?role=creator|brand
 * Creator inbox (default) or the requester's own sent bookings.
 */
export async function GET(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = req.nextUrl.searchParams.get("role") === "brand" ? "brand" : "creator";
  const column = role === "brand" ? "brand_user_id" : "creator_id";

  const { data, error } = await supabase
    .from("jip_bookings")
    .select("*")
    .eq(column, user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const counterpartyIds = Array.from(
    new Set(rows.map((r) => (role === "brand" ? r.creator_id : r.brand_user_id))),
  );

  const { data: counterparties } = counterpartyIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", counterpartyIds)
    : { data: [] as never[] };

  const byId = new Map((counterparties ?? []).map((p) => [p.id, p]));

  const bookings = rows.map((row) => {
    const counterpartyId = role === "brand" ? row.creator_id : row.brand_user_id;
    const cp = byId.get(counterpartyId) ?? null;
    return {
      id: row.id,
      creatorId: row.creator_id,
      brandUserId: row.brand_user_id,
      title: row.title,
      message: row.message,
      status: row.status,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      meetingLink: row.meeting_link,
      createdAt: row.created_at,
      counterparty: cp
        ? {
            userId: cp.id,
            fullName: cp.full_name,
            username: cp.username,
            avatarUrl: cp.avatar_url,
          }
        : null,
    };
  });

  return NextResponse.json({ bookings });
}

/** POST /api/identity/bookings — request a booking / inquiry with a profile owner. */
export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`identity-booking:${user.id}`, 8, 60 * 60 * 1000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const creatorId = body?.creatorId as string | undefined;
  const rawTitle = typeof body?.title === "string" ? body.title.trim() : "";
  const requestType =
    typeof body?.requestType === "string" && REQUEST_TYPES.has(body.requestType)
      ? body.requestType
      : "booking";

  if (!creatorId || !rawTitle) {
    return NextResponse.json({ error: "creatorId and title are required" }, { status: 400 });
  }
  if (creatorId === user.id) {
    return NextResponse.json({ error: "You cannot book yourself" }, { status: 400 });
  }

  const db = createServiceRoleClient();
  const { data: owner } = await db
    .from("profiles")
    .select("id, full_name, username")
    .eq("id", creatorId)
    .maybeSingle();
  if (!owner?.id) {
    return NextResponse.json({ error: "Profile owner not found" }, { status: 404 });
  }

  // Soft de-dupe: same requester → same owner with identical subject in last 10 minutes.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const typeLabel = REQUEST_TYPE_LABEL[requestType] ?? "Booking";
  const title = `[${typeLabel}] ${rawTitle}`.slice(0, 160);

  const { data: dup } = await supabase
    .from("jip_bookings")
    .select("id")
    .eq("creator_id", creatorId)
    .eq("brand_user_id", user.id)
    .eq("title", title)
    .gte("created_at", since)
    .maybeSingle();
  if (dup?.id) {
    return NextResponse.json({ booking: dup, duplicate: true });
  }

  const messageBody =
    typeof body.message === "string" ? body.message.slice(0, 2000) || null : null;

  const row = {
    creator_id: creatorId,
    brand_user_id: user.id,
    title,
    message: messageBody,
    // Public form no longer collects date/duration; keep schema defaults.
    scheduled_at: null,
    duration_minutes: 30,
  };

  const { data, error } = await supabase.from("jip_bookings").insert(row as never).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: requester } = await db
    .from("profiles")
    .select("full_name, username")
    .eq("id", user.id)
    .maybeSingle();
  const requesterName =
    requester?.full_name || (requester?.username ? `@${requester.username}` : "Someone");

  await notifyUser(db as never, {
    userId: creatorId,
    type: "system",
    title: `New ${typeLabel.toLowerCase()} request`,
    message: `${requesterName}: ${rawTitle}`,
    actionUrl: "/identity/bookings",
    actorId: user.id,
    eventKey: `jip-booking:${data.id}`,
    data: {
      bookingId: data.id,
      requestType,
      requesterId: user.id,
    },
  });

  return NextResponse.json({ booking: data });
}
