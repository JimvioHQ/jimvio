import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";
import { notifyPostAuthor } from "@/lib/community/notify-community";

export const dynamic = "force-dynamic";

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

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data, error } = await supabase
    .from("community_post_comments")
    .select("*, profiles!community_post_comments_author_id_fkey(full_name, avatar_url, username)")
    .eq("post_id", postId)
    .eq("is_published", true)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ comments: data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id, author_id, title, community_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { body, parent_id } = (await req.json()) as { body?: string; parent_id?: string | null };
  const text = body?.trim();
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  const { data, error } = await supabase
    .from("community_post_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      parent_id: parent_id || null,
      body: text,
    })
    .select("*, profiles!community_post_comments_author_id_fkey(full_name, avatar_url, username)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.rpc("increment_post_comment_count" as any, { p_post_id: postId });

  void notifyPostAuthorOfComment(supabase, post, postId, user.id, data);

  return NextResponse.json({ comment: data });
}

async function notifyPostAuthorOfComment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  post: { author_id: string; title: string | null; community_id: string },
  postId: string,
  actorId: string,
  comment: { profiles?: { full_name: string | null; username: string | null } | null } | null
): Promise<void> {
  if (post.author_id === actorId) return;
  try {
    const { data: community } = await supabase
      .from("communities")
      .select("slug")
      .eq("id", post.community_id)
      .maybeSingle();
    if (!community?.slug) return;

    const actorProfile = comment?.profiles;
    await notifyPostAuthor(supabase, {
      postAuthorId: post.author_id,
      actorId,
      actorName: actorProfile?.full_name || actorProfile?.username || "Someone",
      postId,
      communitySlug: community.slug,
      postTitle: post.title,
      event: "comment",
    });
  } catch (err) {
    console.error("[posts/comments] notify failed:", err);
  }
}