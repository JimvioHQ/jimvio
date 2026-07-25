import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  getUserMembership,
  isMembershipActive,
} from "@/services/communityService";
import {
  isTargetMuted,
  normalizeNotificationMutes,
  toggleMuteTarget,
  type MuteTargetKind,
  type NotificationMutes,
} from "@/lib/community/notification-mutes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const communityId = req.nextUrl.searchParams.get("communityId")?.trim() ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "communityId is required" }, { status: 400 });
  }

  const membership = await getUserMembership(user.id, communityId);
  if (!isMembershipActive(membership)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data } = await admin
    .from("community_memberships")
    .select("notification_mutes")
    .eq("id", membership.id)
    .maybeSingle();

  const mutes = normalizeNotificationMutes(
    (data as { notification_mutes?: unknown } | null)?.notification_mutes
  );

  const spaceId = req.nextUrl.searchParams.get("spaceId")?.trim();
  const roomId = req.nextUrl.searchParams.get("roomId")?.trim();
  if (spaceId) {
    return NextResponse.json({
      mutes,
      muted: isTargetMuted(mutes, "space", spaceId),
    });
  }
  if (roomId) {
    return NextResponse.json({
      mutes,
      muted: isTargetMuted(mutes, "room", roomId),
    });
  }

  return NextResponse.json({ mutes });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    communityId?: string;
    kind?: MuteTargetKind;
    targetId?: string;
    muted?: boolean;
  };

  const communityId = body.communityId?.trim() ?? "";
  const kind = body.kind;
  const targetId = body.targetId?.trim() ?? "";
  if (!communityId || !kind || !targetId || typeof body.muted !== "boolean") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (kind !== "space" && kind !== "room") {
    return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
  }

  const membership = await getUserMembership(user.id, communityId);
  if (!isMembershipActive(membership)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: row } = await admin
    .from("community_memberships")
    .select("notification_mutes")
    .eq("id", membership.id)
    .maybeSingle();

  const current = normalizeNotificationMutes(
    (row as { notification_mutes?: unknown } | null)?.notification_mutes
  );
  const next: NotificationMutes = toggleMuteTarget(
    current,
    kind,
    targetId,
    body.muted
  );

  const { error } = await admin
    .from("community_memberships")
    .update({
      notification_mutes: next,
      updated_at: new Date().toISOString(),
    })
    .eq("id", membership.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mutes: next,
    muted: isTargetMuted(next, kind, targetId),
  });
}
