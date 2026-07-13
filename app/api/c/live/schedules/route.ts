import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessSpace } from "@/services/accessControl";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId");
  const spaceId = searchParams.get("spaceId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");

  if (!communityId) {
    return NextResponse.json({ error: "communityId required" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("community_memberships")
    .select("status, role")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.status !== "active") {
    return NextResponse.json({ schedules: [] });
  }

  let query = supabase
    .from("live_schedules")
    .select(`
      *,
      host:profiles!host_id (id, full_name, avatar_url, username),
      space:spaces!space_id (id, name, slug, access_type)
    `)
    .eq("community_id", communityId)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (spaceId) {
    query = query.eq("space_id", spaceId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: schedules, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedules: schedules || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { spaceId, title, description, scheduledAt, durationMinutes = 60, privacy = "public", maxViewers = 100, recurrence = "none", recurrenceEnd } = body;

  if (!spaceId || !title || !scheduledAt) {
    return NextResponse.json({ error: "spaceId, title, and scheduledAt required" }, { status: 400 });
  }

  const { data: space } = await supabase
    .from("spaces")
    .select("id, community_id, access_type")
    .eq("id", spaceId)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Space not found" }, { status: 404 });
  }

  const hasAccess = await canAccessSpace(user.id, space.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "You don't have access to this space" }, { status: 403 });
  }

  const scheduleId = crypto.randomUUID();

  const { data: schedule, error } = await supabase
    .from("live_schedules")
    .insert({
      id: scheduleId,
      space_id: spaceId,
      community_id: space.community_id,
      host_id: user.id,
      title,
      description: description ?? null,
      scheduled_at: scheduledAt,
      duration_minutes: durationMinutes,
      privacy,
      max_viewers: maxViewers,
      recurrence,
      recurrence_end: recurrenceEnd ?? null,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule });
}