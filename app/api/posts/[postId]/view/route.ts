import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** POST — record authentic view (deduped). Body: { sessionId?, watchMs?, completionPct? } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    watchMs?: number;
    completionPct?: number;
  };

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, room_id, author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user) {
    const hasAccess = await canAccessRoom(user.id, post.room_id);
    if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });
    // Don't inflate: author viewing own post still counts once/day but is fine
  }

  const { data, error } = await (supabase as any).rpc("record_community_post_view", {
    p_post_id: postId,
    p_user_id: user?.id ?? null,
    p_session_id: body.sessionId ?? null,
    p_watch_ms: Math.max(0, Math.floor(Number(body.watchMs ?? 0))),
    p_completion_pct: Math.min(100, Math.max(0, Number(body.completionPct ?? 0))),
  });

  if (error) {
    // Soft-fail if migration not applied yet
    return NextResponse.json({ ok: false, recorded: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ ok: true, recorded: Boolean(data) });
}
