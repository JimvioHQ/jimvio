import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** DELETE a comment (author or mod). */
export async function DELETE(
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
    .select("id, room_id, community_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: comment } = await supabase
    .from("community_post_comments")
    .select("id, author_id")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const isAuthor = comment.author_id === user.id;
  if (!isAuthor) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("role")
      .eq("community_id", post.community_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const role = membership?.role ?? "";
    if (!["owner", "admin", "moderator"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { error } = await supabase
    .from("community_post_comments")
    .delete()
    .eq("id", commentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: row } = await supabase
    .from("community_posts")
    .select("comment_count")
    .eq("id", postId)
    .maybeSingle();
  if (row) {
    await supabase
      .from("community_posts")
      .update({ comment_count: Math.max(0, (row.comment_count ?? 1) - 1) })
      .eq("id", postId);
  }

  return NextResponse.json({ ok: true });
}
