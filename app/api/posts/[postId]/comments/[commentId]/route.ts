import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

const COMMENT_COLUMNS =
  "id, post_id, author_id, parent_id, body, created_at, is_pinned, like_count, is_published";

/** PATCH — edit / pin comment. Body: { body?, is_pinned? } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  const { postId, commentId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    body?: string;
    is_pinned?: boolean;
  };

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id, community_id, author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  const { data: comment } = await admin
    .from("community_post_comments")
    .select("id, author_id, post_id")
    .eq("id", commentId)
    .eq("post_id", postId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (typeof body.body === "string") {
    if (comment.author_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const text = body.body.trim();
    if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });
    patch.body = text;
    patch.edited_at = new Date().toISOString();
  }

  if (typeof body.is_pinned === "boolean") {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("role")
      .eq("community_id", post.community_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const canPin =
      post.author_id === user.id ||
      membership?.role === "owner" ||
      membership?.role === "admin" ||
      membership?.role === "moderator";
    if (!canPin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    patch.is_pinned = body.is_pinned;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("community_post_comments")
    .update(patch)
    .eq("id", commentId)
    .select(COMMENT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  let profiles = null;
  if (data?.author_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, avatar_url, username")
      .eq("id", data.author_id)
      .maybeSingle();
    profiles = profile ?? null;
  }

  return NextResponse.json({ comment: { ...data, profiles } });
}

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  const { data: comment } = await admin
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

  const { error } = await admin
    .from("community_post_comments")
    .delete()
    .eq("id", commentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: row } = await admin
    .from("community_posts")
    .select("comment_count")
    .eq("id", postId)
    .maybeSingle();
  if (row) {
    await admin
      .from("community_posts")
      .update({ comment_count: Math.max(0, (row.comment_count ?? 1) - 1) })
      .eq("id", postId);
  }

  return NextResponse.json({ ok: true });
}
