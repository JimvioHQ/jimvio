import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function untyped(supabase: Awaited<ReturnType<typeof createClient>>): any {
  return supabase;
}

/** POST — report a post. Body: { reason?: string, details?: string } */
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

  const body = (await req.json().catch(() => ({}))) as {
    reason?: string;
    details?: string;
  };

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, room_id, community_id, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (post.author_id === user.id) {
    return NextResponse.json({ error: "Cannot report your own post" }, { status: 400 });
  }

  const hasAccess = await canAccessRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { error } = await untyped(supabase).from("community_content_reports").insert({
    community_id: post.community_id,
    reporter_id: user.id,
    target_type: "post",
    target_id: postId,
    reason: (body.reason ?? "other").slice(0, 80),
    details: body.details?.slice(0, 2000) ?? null,
    status: "open",
  });

  if (error) {
    if (error.message?.includes("community_content_reports") || error.code === "42P01") {
      return NextResponse.json(
        { error: "Reports table not applied yet — run migration 084" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
