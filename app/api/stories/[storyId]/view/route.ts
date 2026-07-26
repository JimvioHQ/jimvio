import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST — record story view via RPC { watch_ms?, completion_pct? } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    watch_ms?: number;
    completion_pct?: number;
  };

  const { data: story } = await (supabase as any)
    .from("community_stories")
    .select("id, author_id, expires_at")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expired = new Date(story.expires_at).getTime() <= Date.now();
  if (expired && story.author_id !== user.id) {
    return NextResponse.json({ error: "Story expired" }, { status: 410 });
  }

  // Don't count author viewing own story toward unique viewers
  if (story.author_id === user.id) {
    return NextResponse.json({ ok: true, recorded: false, own: true });
  }

  const { data, error } = await (supabase as any).rpc("record_community_story_view", {
    p_story_id: storyId,
    p_user_id: user.id,
    p_watch_ms: Math.max(0, Math.floor(Number(body.watch_ms ?? 0))),
    p_completion_pct: Math.min(100, Math.max(0, Number(body.completion_pct ?? 0))),
  });

  if (error) {
    return NextResponse.json(
      { ok: false, recorded: false, error: error.message },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, recorded: Boolean(data) });
}
