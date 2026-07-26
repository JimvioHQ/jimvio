import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/**
 * POST — save / update bookmark with optional collection + offline metadata.
 * Body: { collectionId?: string | null, offlineMeta?: object }
 * DELETE — remove bookmark
 */
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
    .select("id, room_id, body, title, images, video_url")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    collectionId?: string | null;
    offlineMeta?: Record<string, unknown>;
  };

  const offlineMeta = {
    title: post.title ?? null,
    body_preview: (post.body ?? "").slice(0, 180),
    has_images: Array.isArray(post.images) && (post.images as unknown[]).length > 0,
    has_video: Boolean(post.video_url),
    saved_at: new Date().toISOString(),
    ...(body.offlineMeta ?? {}),
  };

  const db = supabase as any;
  const { data: existing } = await db
    .from("community_saved_posts")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await db
      .from("community_saved_posts")
      .update({
        collection_id: body.collectionId ?? null,
        offline_meta: offlineMeta,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { error } = await db.from("community_saved_posts").insert({
      post_id: postId,
      user_id: user.id,
      collection_id: body.collectionId ?? null,
      offline_meta: offlineMeta,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, offline_meta: offlineMeta });
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

  const { error } = await supabase
    .from("community_saved_posts")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
