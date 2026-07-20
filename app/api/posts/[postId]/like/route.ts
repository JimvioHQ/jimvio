// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@/lib/supabase/server";
// import { canAccessRoom } from "@/services/accessControl";

// export const dynamic = "force-dynamic";

// export async function POST(
//   _req: NextRequest,
//   { params }: { params: Promise<{ postId: string }> }
// ) {
//   const { postId } = await params;
//   const supabase = await createClient();
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { data: post } = await supabase
//     .from("community_posts")
//     .select("room_id, like_count")
//     .eq("id", postId)
//     .maybeSingle();

//   if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

//   const hasAccess = await canAccessRoom(user.id, post.room_id);
//   if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

//   const { data: existing } = await supabase
//     .from("community_post_likes")
//     .select("id")
//     .eq("post_id", postId)
//     .eq("user_id", user.id)
//     .maybeSingle();

//   if (existing) {
//     await supabase.from("community_post_likes").delete().eq("id", existing.id);
//     await supabase
//       .from("community_posts")
//       .update({ like_count: Math.max(0, (post.like_count ?? 1) - 1) })
//       .eq("id", postId);
//     return NextResponse.json({ liked: false });
//   }

//   await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
//   await supabase
//     .from("community_posts")
//     .update({ like_count: (post.like_count ?? 0) + 1 })
//     .eq("id", postId);

//   return NextResponse.json({ liked: true });
// }

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
    await supabase.from("community_post_likes").delete().eq("id", existing.id);
    await supabase.rpc("decrement_post_like_count" as any, { p_post_id: postId });
    return NextResponse.json({ liked: false });
  }

  await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
  await supabase.rpc("increment_post_like_count" as any, { p_post_id: postId });

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