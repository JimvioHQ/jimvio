import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/** POST — record a share (and return permalink). */
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
    .select("id, room_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  // share_count may be missing until migration 084 — use untyped update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: row } = await db
    .from("community_posts")
    .select("share_count")
    .eq("id", postId)
    .maybeSingle();

  const next = ((row?.share_count as number | null | undefined) ?? 0) + 1;
  const { error } = await db
    .from("community_posts")
    .update({ share_count: next, updated_at: new Date().toISOString() })
    .eq("id", postId);

  if (error && !String(error.message ?? "").includes("share_count")) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, share_count: next });
}
