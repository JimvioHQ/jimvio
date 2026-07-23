import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveGroupManageContext,
  type OwnerGroupAnalytics,
} from "@/lib/community/owner-console/groups";

export const dynamic = "force-dynamic";

/**
 * Group analytics shell — reuses existing counters; no duplicate analytics engine.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceRoleClient();
  const { data: space } = await admin
    .from("spaces")
    .select(
      "id, community_id, member_count, room_count, created_at, last_activity_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!space) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const ctx = await resolveGroupManageContext(
    supabase,
    user.id,
    space.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { count: courseRooms } = await admin
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("space_id", id)
    .eq("room_type", "course")
    .eq("is_active", true);

  const { count: resourceRooms } = await admin
    .from("rooms")
    .select("id", { count: "exact", head: true })
    .eq("space_id", id)
    .eq("room_type", "resources")
    .eq("is_active", true);

  const members = space.member_count ?? 0;
  const channels = space.room_count ?? 0;

  const analytics: OwnerGroupAnalytics = {
    growth: Math.min(100, Math.round(members * 2.5)),
    members,
    activity: Math.min(100, channels * 12 + (space.last_activity_at ? 20 : 0)),
    knowledge: Math.min(100, (resourceRooms ?? 0) * 25),
    commerce: 0,
    live: 0,
    courses: Math.min(100, (courseRooms ?? 0) * 30),
    retention: members > 0 ? Math.min(100, 55 + Math.round(members / 10)) : 0,
  };

  return NextResponse.json({ analytics });
}
