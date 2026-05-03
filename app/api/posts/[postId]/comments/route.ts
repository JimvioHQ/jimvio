import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

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

  const { data: post } = await supabase.from("community_posts").select("room_id").eq("id", postId).maybeSingle();
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
    .select("room_id, comment_count")
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

  await supabase
    .from("community_posts")
    .update({ comment_count: (post.comment_count ?? 0) + 1 })
    .eq("id", postId);

  return NextResponse.json({ comment: data });
}
