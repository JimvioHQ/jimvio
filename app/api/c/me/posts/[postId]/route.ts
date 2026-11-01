import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Permanently delete only a post authored by the authenticated user. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  if (!postId) return NextResponse.json({ error: "Post ID is required." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: post, error: lookupError } = await supabase
    .from("community_posts")
    .select("id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (lookupError) return NextResponse.json({ error: "Could not verify post ownership." }, { status: 500 });
  if (!post) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  if (post.author_id !== user.id) return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 });

  const { data: deleted, error: deleteError } = await supabase
    .from("community_posts")
    .delete()
    .eq("id", postId)
    .eq("author_id", user.id)
    .select("id")
    .maybeSingle();

  if (deleteError) return NextResponse.json({ error: "The post could not be deleted." }, { status: 400 });
  if (!deleted) return NextResponse.json({ error: "Post not found or no longer belongs to you." }, { status: 404 });

  return NextResponse.json({ ok: true, deletedId: deleted.id });
}
