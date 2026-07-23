import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  resolveChannelManageContext,
  type OwnerChannelAnalytics,
} from "@/lib/community/owner-console/channels";

export const dynamic = "force-dynamic";

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
  const { data: room } = await admin
    .from("rooms")
    .select(
      "id, community_id, room_type, message_count, member_count, pinned_count, last_activity_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!room) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  const ctx = await resolveChannelManageContext(
    supabase,
    user.id,
    room.community_id
  );
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const messages = room.message_count ?? 0;
  const members = room.member_count ?? 0;
  const isLive = room.room_type === "live";
  const isResources = room.room_type === "resources";

  const analytics: OwnerChannelAnalytics = {
    messages,
    activeMembers: members,
    growth: Math.min(100, Math.round(members * 3)),
    engagement: Math.min(
      100,
      Math.round(messages / Math.max(1, members) + (room.pinned_count ?? 0) * 5)
    ),
    knowledgeGenerated: isResources ? Math.min(100, messages) : Math.min(40, messages),
    filesShared: isResources ? Math.min(100, (room.pinned_count ?? 0) * 10) : 0,
    commerceActivity: room.room_type === "chat" ? 0 : 0,
    liveActivity: isLive ? Math.min(100, 40 + messages) : 0,
  };

  return NextResponse.json({ analytics });
}
