import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canEngageWithRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

const SHARE_TYPES = new Set(["link", "repost", "quote", "community", "external", "copy"]);

/** POST — record a share (ledger + counter). Body: { type?, communityId? } */
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
    type?: string;
    communityId?: string;
  };
  const shareType = SHARE_TYPES.has(body.type ?? "") ? (body.type as string) : "link";

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, room_id, community_id, body, author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canEngageWithRoom(user.id, post.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const db = supabase as any;

  await db.from("community_post_shares").insert({
    post_id: postId,
    user_id: user.id,
    share_type: shareType,
    target_community_id: body.communityId ?? null,
  });

  const { data: row } = await db
    .from("community_posts")
    .select("share_count")
    .eq("id", postId)
    .maybeSingle();

  const next = ((row?.share_count as number | null | undefined) ?? 0) + 1;
  await db
    .from("community_posts")
    .update({ share_count: next, updated_at: new Date().toISOString() })
    .eq("id", postId);

  let repostId: string | null = null;
  if (shareType === "repost" && body.communityId) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", body.communityId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membership) {
      const { data: room } = await supabase
        .from("rooms")
        .select("id, space_id")
        .eq("community_id", body.communityId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (room?.id && room.space_id) {
        const { data: created } = await db
          .from("community_posts")
          .insert({
            community_id: body.communityId,
            room_id: room.id,
            space_id: room.space_id,
            author_id: user.id,
            body: post.body ?? "",
            post_type: "discussion",
            quote_of_post_id: postId,
            is_published: true,
            published_at: new Date().toISOString(),
            attachments: { share_type: "repost", source_post_id: postId },
          })
          .select("id")
          .single();
        repostId = created?.id ?? null;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    share_count: next,
    share_type: shareType,
    repost_id: repostId,
    permalink: `/communities/feed?post=${postId}`,
  });
}
