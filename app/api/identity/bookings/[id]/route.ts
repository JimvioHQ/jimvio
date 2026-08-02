import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUSES = ["accepted", "declined", "cancelled", "completed"] as const;

/** PATCH /api/identity/bookings/[id] — creator accepts/declines, either party cancels. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = (await createClient()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = body?.status as string | undefined;
  if (!status || !STATUSES.includes(status as typeof STATUSES[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { status };
  if (typeof body.meetingLink === "string") patch.meeting_link = body.meetingLink || null;
  if (typeof body.scheduledAt === "string") patch.scheduled_at = body.scheduledAt || null;

  const { data, error } = await supabase
    .from("jip_bookings")
    .update(patch as never)
    .eq("id", id)
    .or(`creator_id.eq.${user.id},brand_user_id.eq.${user.id}`)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ booking: data });
}
