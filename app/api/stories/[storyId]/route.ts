import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GET — single active story (or own expired for author) */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("community_stories")
    .select(
      "id, author_id, community_id, media_url, media_type, caption, thumbnail_url, privacy, mentions, view_count, unique_view_count, reply_count, expires_at, created_at, profiles!community_stories_author_id_fkey(full_name, avatar_url, username)"
    )
    .eq("id", storyId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const expired = new Date(data.expires_at).getTime() <= Date.now();
  if (expired && data.author_id !== user.id) {
    return NextResponse.json({ error: "Story expired" }, { status: 410 });
  }

  return NextResponse.json({ story: data });
}

/** DELETE — author only */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await (supabase as any)
    .from("community_stories")
    .select("id, author_id")
    .eq("id", storyId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.author_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await (supabase as any)
    .from("community_stories")
    .delete()
    .eq("id", storyId)
    .eq("author_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
