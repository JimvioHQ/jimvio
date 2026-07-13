import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessSpace } from "@/services/accessControl";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedule } = await supabase
    .from("live_schedules")
    .select(`
      *,
      host:profiles!host_id (id, full_name, avatar_url, username),
      space:spaces!space_id (id, name, slug, access_type)
    `)
    .eq("id", scheduleId)
    .maybeSingle();

  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }

  const hasAccess = await canAccessSpace(user.id, schedule.space_id);
  if (!hasAccess && schedule.privacy !== "public") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  return NextResponse.json({ schedule });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedule } = await supabase
    .from("live_schedules")
    .select("host_id, status")
    .eq("id", scheduleId)
    .maybeSingle();

  if (!schedule || schedule.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can update" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, scheduledAt, durationMinutes, privacy, maxViewers, recurrence, recurrenceEnd, status } = body;

  const { data: updated, error } = await supabase
    .from("live_schedules")
    .update({
      title: title ?? undefined,
      description: description ?? undefined,
      scheduled_at: scheduledAt ?? undefined,
      duration_minutes: durationMinutes ?? undefined,
      privacy: privacy ?? undefined,
      max_viewers: maxViewers ?? undefined,
      recurrence: recurrence ?? undefined,
      recurrence_end: recurrenceEnd ?? undefined,
      status: status ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduleId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { scheduleId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: schedule } = await supabase
    .from("live_schedules")
    .select("host_id")
    .eq("id", scheduleId)
    .maybeSingle();

  if (!schedule || schedule.host_id !== user.id) {
    return NextResponse.json({ error: "Only host can delete" }, { status: 403 });
  }

  const { error } = await supabase
    .from("live_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}