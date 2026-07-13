import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canUserAccessLiveSession } from "@/lib/actions/live-sessions";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hasAccess = await canUserAccessLiveSession(user.id, sessionId);
  if (!hasAccess) {
    return NextResponse.json({ error: "You don't have access to this session's space" }, { status: 403 });
  }

  // Also return the session details for UI
  const { data: session } = await supabase
    .from("live_sessions")
    .select("id, title, status, privacy, space_id, community_id")
    .eq("id", sessionId)
    .maybeSingle();

  return NextResponse.json({ hasAccess: true, session });
}