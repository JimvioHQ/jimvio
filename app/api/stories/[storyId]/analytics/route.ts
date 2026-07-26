import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET — author-only story analytics */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: story } = await (supabase as any)
    .from("community_stories")
    .select("id, author_id, view_count, unique_view_count, reply_count")
    .eq("id", storyId)
    .maybeSingle();

  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (story.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: analytics } = await (supabase as any)
    .from("community_story_analytics")
    .select(
      "story_id, author_id, views, unique_viewers, replies, avg_watch_ms, avg_completion_pct, retained_until, updated_at"
    )
    .eq("story_id", storyId)
    .maybeSingle();

  if (analytics) {
    return NextResponse.json({ analytics });
  }

  // Fallback snapshot from story counters when analytics row not yet written
  return NextResponse.json({
    analytics: {
      story_id: storyId,
      author_id: story.author_id,
      views: story.view_count ?? 0,
      unique_viewers: story.unique_view_count ?? 0,
      replies: story.reply_count ?? 0,
      avg_watch_ms: 0,
      avg_completion_pct: 0,
      retained_until: null,
      updated_at: null,
    },
  });
}
