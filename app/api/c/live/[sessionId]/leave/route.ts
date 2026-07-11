import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error: participantError } = await supabase
    .from("live_session_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .is("left_at", null);

  if (participantError) {
    return NextResponse.json({ error: participantError.message }, { status: 500 });
  }

  await supabase
    .from("live_sessions")
    .update({ 
      viewer_count: supabase.rpc("decrement_viewer_count", { session_id: sessionId }),
    })
    .eq("id", sessionId);

  return NextResponse.json({ success: true });
}