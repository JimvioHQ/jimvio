import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

/** POST /api/identity/bookings — request a booking with a creator ("Book" CTA). */
export async function POST(req: NextRequest) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const creatorId = body?.creatorId as string | undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!creatorId || !title) {
    return NextResponse.json({ error: "creatorId and title are required" }, { status: 400 });
  }
  if (creatorId === user.id) {
    return NextResponse.json({ error: "You cannot book yourself" }, { status: 400 });
  }

  const row = {
    creator_id: creatorId,
    brand_user_id: user.id,
    title: title.slice(0, 160),
    message: typeof body.message === "string" ? body.message.slice(0, 2000) || null : null,
    scheduled_at: typeof body.scheduledAt === "string" ? body.scheduledAt || null : null,
    duration_minutes: Number.isFinite(body.durationMinutes) ? Math.max(15, Math.trunc(body.durationMinutes)) : 30,
  };

  const { data, error } = await supabase.from("jip_bookings").insert(row as never).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}
