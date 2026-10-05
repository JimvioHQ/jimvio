import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  canAccessRoom,
  canEngageWithCommunityPost,
  canReadPublicCommunityRoom,
} from "@/services/accessControl";
import { notifyPostAuthor } from "@/lib/community/notify-community";
import { assertCanCommentInRoom } from "@/lib/community/workspace/assert-can-publish";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authz with user client; load comments via service role after gate so
  // nested RLS on comments+communities cannot statement-timeout the read.
  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id, community_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberAccess = user ? await canAccessRoom(user.id, post.room_id) : false;
  const publicAccess = memberAccess
    ? true
    : user
      ? await canEngageWithCommunityPost(user.id, {
          room_id: post.room_id,
          community_id: post.community_id,
        })
      : await canReadPublicCommunityRoom(post.room_id);
  if (!memberAccess && !publicAccess) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const before = searchParams.get("before");
  const sort = searchParams.get("sort") ?? "newest"; // top | newest | oldest

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  let query = admin
    .from("community_post_comments")
    .select(
      "id, post_id, author_id, parent_id, body, created_at, is_pinned, like_count, is_published, profiles!community_post_comments_author_id_fkey(full_name, avatar_url, username)"
    )
    .eq("post_id", postId)
    .eq("is_published", true);

  if (before) query = query.lt("created_at", before);

  // Fetch newest-first from DB; apply sort client-side for pinned/top.
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(Math.min(200, limit * 2));

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to load comments" },
      { status: 500 }
    );
  }

  type CommentRow = {
    created_at: string;
    is_pinned?: boolean | null;
    like_count?: number | null;
    parent_id?: string | null;
  };

  let comments = (data ?? []) as CommentRow[];

  if (sort === "oldest") {
    comments = comments.slice().sort((a, b) => a.created_at.localeCompare(b.created_at));
  } else if (sort === "top") {
    comments = comments.slice().sort((a, b) => {
      const pin = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
      if (pin !== 0) return pin;
      const likes = (b.like_count ?? 0) - (a.like_count ?? 0);
      if (likes !== 0) return likes;
      return b.created_at.localeCompare(a.created_at);
    });
  } else {
    // newest — pinned first, then by time
    comments = comments.slice().sort((a, b) => {
      const pin = Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned));
      if (pin !== 0) return pin;
      return b.created_at.localeCompare(a.created_at);
    });
  }

  comments = comments.slice(0, limit);
  const nextCursor =
    comments.length === limit ? comments[comments.length - 1]?.created_at ?? null : null;

  return NextResponse.json({ comments, nextCursor, sort });
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

  const limited = rateLimit(`post-comment:${user.id}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many comments — try again shortly" },
      { status: 429 }
    );
  }

  const { data: post } = await (supabase as any)
    .from("community_posts")
    .select("room_id, author_id, title, community_id, comments_disabled")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (post.comments_disabled) {
    return NextResponse.json({ error: "Comments are disabled on this post" }, { status: 403 });
  }

  // Same hub-feed engagement gate as likes/share/views (public communities + members).
  const hasAccess = await canEngageWithCommunityPost(user.id, {
    room_id: post.room_id,
    community_id: post.community_id,
  });
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const memberAccess = await canAccessRoom(user.id, post.room_id);
  if (memberAccess) {
    const commentGate = await assertCanCommentInRoom(supabase, user.id, post.room_id);
    if (!commentGate.ok) {
      return NextResponse.json(
        { error: commentGate.error },
        { status: commentGate.status }
      );
    }
  }

  const { body, parent_id } = (await req.json()) as { body?: string; parent_id?: string | null };
  const text = body?.trim();
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });

  let parentId: string | null = null;
  if (typeof parent_id === "string" && parent_id) {
    // Parent lookup via service role after post-level authz (avoids nested comment RLS).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminCheck = createServiceRoleClient() as any;
    const { data: parent } = await adminCheck
      .from("community_post_comments")
      .select("id, post_id")
      .eq("id", parent_id)
      .eq("post_id", postId)
      .maybeSingle();
    if (!parent) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 });
    }
    parentId = parent.id;
  }

  // Authz already verified above. Insert + hydrate via service role so nested
  // comment RLS WITH CHECK / RETURNING policies cannot statement-timeout.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createServiceRoleClient() as any;
  const { data, error } = await admin
    .from("community_post_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      parent_id: parentId,
      body: text,
      is_published: true,
    })
    .select(
      "id, post_id, author_id, parent_id, body, created_at, is_pinned, like_count, is_published, profiles!community_post_comments_author_id_fkey(full_name, avatar_url, username)"
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to post comment" },
      { status: 400 }
    );
  }
  if (!data?.id) {
    return NextResponse.json(
      { error: "Comment was not saved" },
      { status: 500 }
    );
  }

  await admin.rpc("increment_post_comment_count", { p_post_id: postId });

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
