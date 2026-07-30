import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isCommunityMuted,
  isRoomMuted,
  isSpaceMuted,
  parseNotificationMutes,
  withCommunityMute,
  withRoomMute,
  withSpaceMute,
} from "@/lib/community/notification-mutes";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabase as any;
  const { data: membership, error } = await db
    .from("community_memberships")
    .select("notification_mutes")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!membership) return NextResponse.json({ error: "No active membership" }, { status: 404 });

  const mutes = parseNotificationMutes(membership.notification_mutes);
  return NextResponse.json({
    muted: isCommunityMuted(mutes),
    notification_mutes: mutes,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ communityId: string }> }
) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    muted?: unknown;
    spaceId?: unknown;
    roomId?: unknown;
  } | null;
  if (typeof body?.muted !== "boolean") {
    return NextResponse.json({ error: "muted must be a boolean" }, { status: 400 });
  }

  const spaceId = typeof body.spaceId === "string" && body.spaceId ? body.spaceId : null;
  const roomId = typeof body.roomId === "string" && body.roomId ? body.roomId : null;

  // Read-modify-write preserves the established spaces/rooms mute preferences.
  const db = supabase as any;
  const { data: membership, error: membershipError } = await db
    .from("community_memberships")
    .select("id, notification_mutes")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 400 });
  }
  if (!membership) return NextResponse.json({ error: "No active membership" }, { status: 404 });

  let notification_mutes;
  if (roomId) {
    notification_mutes = withRoomMute(membership.notification_mutes, roomId, body.muted);
  } else if (spaceId) {
    notification_mutes = withSpaceMute(membership.notification_mutes, spaceId, body.muted);
  } else {
    notification_mutes = withCommunityMute(membership.notification_mutes, body.muted);
  }

  const { error } = await db
    .from("community_memberships")
    .update({ notification_mutes })
    .eq("id", membership.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const muted = roomId
    ? isRoomMuted(notification_mutes, roomId)
    : spaceId
      ? isSpaceMuted(notification_mutes, spaceId)
      : isCommunityMuted(notification_mutes);

  return NextResponse.json({ muted, notification_mutes });
}
