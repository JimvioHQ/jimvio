import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom, canReadPublicCommunityRoom } from "@/services/accessControl";
import { sanitizePostImageUrls } from "@/lib/community/posts/sanitize-post-media";

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

  const { data: post } = await supabase
    .from("community_posts")
    .select("room_id, community_id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const memberAccess = user ? await canAccessRoom(user.id, post.room_id) : false;
  const publicAccess = memberAccess ? true : await canReadPublicCommunityRoom(post.room_id);
  if (!memberAccess && !publicAccess) {
    return NextResponse.json({ error: "No access" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("community_posts")
    .select("*, profiles!community_posts_author_id_fkey(full_name, avatar_url, username)")
    .eq("id", postId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}

export async function PATCH(
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
    .select("room_id, author_id, community_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const isAuthor = post.author_id === user.id;
  const { data: staff } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", post.community_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const isStaff =
    staff?.role === "owner" || staff?.role === "admin" || staff?.role === "moderator";

  if (!isAuthor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const patch = (await req.json()) as Record<string, unknown>;
  const allowed = [
    "title",
    "body",
    "post_type",
    "images",
    "attachments",
    "video_url",
    "is_pinned",
    "is_exclusive",
    "is_published",
    "comments_disabled",
    "archived_at",
    "audience",
  ];

  const update: Record<string, unknown> = {};
  for (const k of allowed) {
    if (k in patch) update[k] = patch[k];
  }

  if ("images" in update) {
    update.images = sanitizePostImageUrls(update.images);
  }

  // Archive: author/staff may set or clear
  if ("archived_at" in patch) {
    if (patch.archived_at === true) {
      update.archived_at = new Date().toISOString();
    } else if (patch.archived_at === false || patch.archived_at === null) {
      update.archived_at = null;
    } else if (typeof patch.archived_at === "string") {
      update.archived_at = patch.archived_at;
    }
  }

  if ("comments_disabled" in patch) {
    update.comments_disabled = Boolean(patch.comments_disabled);
  }

  // Authors may edit content, publish/unpublish, archive, disable comments, and pin own posts.
  // Staff may also change exclusivity.
  if (!isStaff && !isAuthor) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isStaff) {
    delete update.is_exclusive;
  }

  if (update.is_published === true && isAuthor) {
    update.published_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as any)
    .from("community_posts")
    .update(update)
    .eq("id", postId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ post: data });
}

export async function DELETE(
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
    .select("room_id, author_id, community_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const isAuthor = post.author_id === user.id;
  const { data: staff } = await supabase
    .from("community_memberships")
    .select("role")
    .eq("community_id", post.community_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const isStaff =
    staff?.role === "owner" || staff?.role === "admin" || staff?.role === "moderator";

  if (!isAuthor && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
