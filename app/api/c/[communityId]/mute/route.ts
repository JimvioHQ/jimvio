import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  const body = (await req.json().catch(() => null)) as { muted?: unknown } | null;
  if (typeof body?.muted !== "boolean") {
    return NextResponse.json({ error: "muted must be a boolean" }, { status: 400 });
  }

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

  const existing =
    membership.notification_mutes &&
    typeof membership.notification_mutes === "object" &&
    !Array.isArray(membership.notification_mutes)
      ? membership.notification_mutes
      : {};
  const notification_mutes = { ...existing, community: body.muted };
  const { error } = await db
    .from("community_memberships")
    .update({ notification_mutes })
    .eq("id", membership.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ muted: body.muted, notification_mutes });
}
