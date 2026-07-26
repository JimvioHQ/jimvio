import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** GET — creator post analytics (owner only). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await (supabase as any)
    .from("community_posts")
    .select(
      "id, author_id, room_id, like_count, comment_count, share_count, view_count, unique_view_count, reaction_counts, created_at, body"
    )
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const admin = createServiceRoleClient() as any;
  const [{ data: views }, { data: shares }, { count: bookmarkCount }] = await Promise.all([
    admin
      .from("community_post_views")
      .select("watch_ms, completion_pct, user_id")
      .eq("post_id", postId)
      .limit(5000),
    admin
      .from("community_post_shares")
      .select("share_type")
      .eq("post_id", postId)
      .limit(2000),
    admin
      .from("community_saved_posts")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId),
  ]);

  const impressions = Number(post.view_count ?? 0);
  const reach = Number(post.unique_view_count ?? views?.length ?? 0);
  const likes = Number(post.like_count ?? 0);
  const comments = Number(post.comment_count ?? 0);
  const shareCount = Number(post.share_count ?? shares?.length ?? 0);
  const bookmarks = bookmarkCount ?? 0;
  const engagements = likes + comments + shareCount + bookmarks;
  const engagementRate = reach > 0 ? engagements / reach : 0;
  const avgWatchMs =
    (views ?? []).length > 0
      ? (views as any[]).reduce((s, v) => s + Number(v.watch_ms ?? 0), 0) /
        (views as any[]).length
      : 0;
  const avgCompletion =
    (views ?? []).length > 0
      ? (views as any[]).reduce((s, v) => s + Number(v.completion_pct ?? 0), 0) /
        (views as any[]).length
      : 0;

  const traffic: Record<string, number> = { feed: reach };
  for (const row of shares ?? []) {
    const t = String(row.share_type ?? "link");
    traffic[t] = (traffic[t] ?? 0) + 1;
  }

  return NextResponse.json({
    views: impressions,
    reach,
    likes,
    comments,
    shares: shareCount,
    bookmarks,
    ctr: reach > 0 ? comments / reach : 0,
    engagementRate: Number(engagementRate.toFixed(4)),
    audience: { uniqueViewers: reach },
    trafficSource: traffic,
    watchTimeMs: Math.round(avgWatchMs),
    completionPct: Number(avgCompletion.toFixed(2)),
    reactionCounts: post.reaction_counts ?? {},
  });
}
