import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** POST — toggle like on a comment */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const { postId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: comment } = await supabase
    .from("community_post_comments")
    .select("id, like_count")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const db = supabase as any;
  const { data: existing } = await db
    .from("community_comment_likes")
    .select("id")
    .eq("comment_id", commentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    await db.from("community_comment_likes").delete().eq("id", existing.id);
    const next = Math.max(0, (comment.like_count ?? 1) - 1);
    await supabase
      .from("community_post_comments")
      .update({ like_count: next } as never)
      .eq("id", commentId);
    return NextResponse.json({ liked: false, like_count: next });
  }

  const { error } = await db.from("community_comment_likes").insert({
    comment_id: commentId,
    user_id: user.id,
  });
  if (error) {
    // Table may not exist yet — soft-fail with in-memory increment path
    const next = (comment.like_count ?? 0) + 1;
    await supabase
      .from("community_post_comments")
      .update({ like_count: next } as never)
      .eq("id", commentId);
    return NextResponse.json({ liked: true, like_count: next, ephemeral: true });
  }

  const next = (comment.like_count ?? 0) + 1;
  await supabase
    .from("community_post_comments")
    .update({ like_count: next } as never)
    .eq("id", commentId);
  return NextResponse.json({ liked: true, like_count: next });
}
