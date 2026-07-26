import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";
import { notifyPostAuthor } from "@/lib/community/notify-community";

export const dynamic = "force-dynamic";

export async function POST(
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
    .select("room_id, author_id, title, community_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: existing } = await supabase
    .from("community_post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    const { error: delError } = await supabase
      .from("community_post_likes")
      .delete()
      .eq("id", existing.id);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: decError } = await supabase.rpc("decrement_post_like_count" as any, {
      p_post_id: postId,
    });
    if (decError) {
      console.error("[posts/like] decrement failed:", decError.message);
    }
    return NextResponse.json({ liked: false });
  }

  const { error: insertError } = await supabase
    .from("community_post_likes")
    .insert({ post_id: postId, user_id: user.id });
  if (insertError) {
    // Unique violation = concurrent like; treat as liked.
    if (insertError.code === "23505") {
      return NextResponse.json({ liked: true });
    }
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: incError } = await supabase.rpc("increment_post_like_count" as any, {
    p_post_id: postId,
  });
  if (incError) {
    console.error("[posts/like] increment failed:", incError.message);
  }

  void notifyPostAuthorOfLike(supabase, post, postId, user.id);

  return NextResponse.json({ liked: true });
}

async function notifyPostAuthorOfLike(
  supabase: Awaited<ReturnType<typeof createClient>>,
  post: { author_id: string; title: string | null; community_id: string },
  postId: string,
  actorId: string
): Promise<void> {
  if (post.author_id === actorId) return;
  try {
    const [{ data: actorProfile }, { data: community }] = await Promise.all([
      supabase.from("profiles").select("full_name, username").eq("id", actorId).maybeSingle(),
      supabase.from("communities").select("slug").eq("id", post.community_id).maybeSingle(),
    ]);
    if (!community?.slug) return;

    await notifyPostAuthor(supabase, {
      postAuthorId: post.author_id,
      actorId,
      actorName: actorProfile?.full_name || actorProfile?.username || "Someone",
      postId,
      communitySlug: community.slug,
      postTitle: post.title,
      event: "like",
    });
  } catch (err) {
    console.error("[posts/like] notify failed:", err);
  }
}
