import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canEngageWithRoom } from "@/services/accessControl";
import { isPostReactionId, type PostReactionId } from "@/lib/feed/reactions";
import { notifyPostAuthor } from "@/lib/community/notify-community";

export const dynamic = "force-dynamic";

async function recountReactions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string
) {
  const db = supabase as any;
  const { data } = await db
    .from("community_post_reactions")
    .select("reaction")
    .eq("post_id", postId);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = String(row.reaction);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  await db
    .from("community_posts")
    .update({ reaction_counts: counts, updated_at: new Date().toISOString() })
    .eq("id", postId);
  return counts;
}

/** POST — set/clear reaction. Body: { reaction: PostReactionId | null } */
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

  const body = (await req.json().catch(() => ({}))) as { reaction?: string | null };
  const reaction =
    body.reaction == null || body.reaction === ""
      ? null
      : isPostReactionId(body.reaction)
        ? (body.reaction as PostReactionId)
        : null;

  if (body.reaction && !reaction) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id, author_id, title, community_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canEngageWithRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const db = supabase as any;

  if (!reaction) {
    await db
      .from("community_post_reactions")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
    // Keep legacy like row cleared when clearing reaction — and keep like_count honest.
    const { data: existingLike } = await supabase
      .from("community_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingLike) {
      await supabase
        .from("community_post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      await createServiceRoleClient().rpc("decrement_post_like_count" as any, { p_post_id: postId });
    }
    const counts = await recountReactions(supabase, postId);
    return NextResponse.json({ reaction: null, counts });
  }

  const { error } = await db.from("community_post_reactions").upsert(
    {
      post_id: postId,
      user_id: user.id,
      reaction,
      created_at: new Date().toISOString(),
    },
    { onConflict: "post_id,user_id" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mirror "like" into legacy likes table for counters/back-compat
  if (reaction === "like" || reaction === "love" || reaction === "fire" || reaction === "clap") {
    const { data: existing } = await supabase
      .from("community_post_likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      await supabase.from("community_post_likes").insert({ post_id: postId, user_id: user.id });
      await createServiceRoleClient().rpc("increment_post_like_count" as any, { p_post_id: postId });
      if (post.author_id !== user.id) {
        try {
          const [{ data: actor }, { data: community }] = await Promise.all([
            supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle(),
            supabase.from("communities").select("slug").eq("id", post.community_id).maybeSingle(),
          ]);
          if (community?.slug) {
            await notifyPostAuthor(supabase, {
              postAuthorId: post.author_id,
              actorId: user.id,
              actorName: actor?.full_name || actor?.username || "Someone",
              postId,
              communitySlug: community.slug,
              postTitle: post.title,
              event: "like",
            });
          }
        } catch {
          /* non-fatal */
        }
      }
    }
  }

  const counts = await recountReactions(supabase, postId);
  return NextResponse.json({ reaction, counts });
}

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

  const db = supabase as any;
  const [{ data: mine }, { data: all }] = await Promise.all([
    db
      .from("community_post_reactions")
      .select("reaction")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle(),
    db.from("community_post_reactions").select("reaction").eq("post_id", postId),
  ]);

  const counts: Record<string, number> = {};
  for (const row of all ?? []) {
    counts[row.reaction] = (counts[row.reaction] ?? 0) + 1;
  }

  return NextResponse.json({ reaction: mine?.reaction ?? null, counts });
}
