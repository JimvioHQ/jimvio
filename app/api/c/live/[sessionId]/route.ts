import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error } = await supabase
    .from("live_sessions")
    .select(`
      id, title, description, status, privacy, started_at, max_viewers, stream_key,
      space:spaces!space_id (id, name, slug, access_type),
      host:profiles!host_id (id, full_name, avatar_url, username)
    `)
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Flatten space.access_type to space_access_type for client compatibility
  const flattenedSession = {
    ...session,
    space_access_type: session.space?.access_type ?? "free",
  };

  const { count: viewerCount } = await supabase
    .from("live_session_participants")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .neq("role", "host");

  return NextResponse.json({
    session: {
      ...flattenedSession,
      viewer_count: viewerCount ?? 0,
    },
  });
}
