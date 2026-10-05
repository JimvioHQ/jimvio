import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canEngageWithCommunityPost } from "@/services/accessControl";

export const dynamic = "force-dynamic";

const SHARE_TYPES = new Set([
  "link",
  "repost",
  "quote",
  "community",
  "external",
  "copy",
  "whatsapp",
  "facebook",
  "x",
  "email",
]);

function permalinkFor(
  postId: string,
  communitySlug: string | null | undefined,
): string {
  if (communitySlug) return `/communities/${communitySlug}/feed?post=${postId}`;
  return `/communities/feed?post=${postId}`;
}

/** POST — record a share/repost. Body: { type?, communityId? } */
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
    .select("id, room_id, community_id, body, author_id, images, video_url, title")
    .eq("id", postId)
    .maybeSingle();

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const hasAccess = await canEngageWithCommunityPost(user.id, {
    room_id: post.room_id,
    community_id: post.community_id,
  });
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: sourceCommunity } = await supabase
    .from("communities")
    .select("slug")
    .eq("id", post.community_id)
    .maybeSingle();

  const db = supabase as any;
  const permalink = permalinkFor(postId, sourceCommunity?.slug);

  let repostId: string | null = null;
  const targetCommunityId =
    shareType === "repost" || shareType === "community"
      ? body.communityId || post.community_id
      : null;

  // Membership + duplicate checks before any share_count mutation.
  if ((shareType === "repost" || shareType === "community") && targetCommunityId) {
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("id")
      .eq("community_id", targetCommunityId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      const { data: row } = await db
        .from("community_posts")
        .select("share_count")
        .eq("id", postId)
        .maybeSingle();
      return NextResponse.json(
        {
          ok: false,
          error: "You must be a member of that community to share there",
          share_count: Number(row?.share_count ?? 0) || 0,
          permalink,
        },
        { status: 403 },
      );
    }

    const { data: existingRepost } = await db
      .from("community_posts")
      .select("id")
      .eq("author_id", user.id)
      .eq("quote_of_post_id", postId)
      .eq("community_id", targetCommunityId)
      .eq("is_published", true)
      .is("archived_at", null)
      .maybeSingle();
    if (existingRepost?.id) {
      const { data: row } = await db
        .from("community_posts")
        .select("share_count")
        .eq("id", postId)
        .maybeSingle();
      return NextResponse.json({
        ok: true,
        share_count: Number(row?.share_count ?? 0) || 0,
        share_type: shareType,
        repost_id: existingRepost.id,
        permalink,
        duplicate: true,
      });
    }

    const { data: room } = await supabase
      .from("rooms")
      .select("id, space_id")
      .eq("community_id", targetCommunityId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!room?.id || !room.space_id) {
      const { data: row } = await db
        .from("community_posts")
        .select("share_count")
        .eq("id", postId)
        .maybeSingle();
      return NextResponse.json(
        {
          error: "No active room available in that community",
          share_count: Number(row?.share_count ?? 0) || 0,
          permalink,
        },
        { status: 400 },
      );
    }

    const attribution =
      shareType === "community"
        ? `Shared from ${sourceCommunity?.slug ? `@${sourceCommunity.slug}` : "Jimvio"}`
        : "";
    const { data: created, error: createError } = await db
      .from("community_posts")
      .insert({
        community_id: targetCommunityId,
        room_id: room.id,
        space_id: room.space_id,
        author_id: user.id,
        body: post.body ?? "",
        title: post.title ?? null,
        images: post.images ?? null,
        video_url: post.video_url ?? null,
        post_type: "discussion",
        quote_of_post_id: postId,
        is_published: true,
        published_at: new Date().toISOString(),
        attachments: {
          share_type: shareType,
          source_post_id: postId,
          source_community_id: post.community_id,
          attribution,
        },
      })
      .select("id")
      .single();
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }
    repostId = created?.id ?? null;
  }

  // Analytics ledger — menu opens are never recorded; failed membership never reaches here.
  const { error: shareInsertError } = await db.from("community_post_shares").insert({
    post_id: postId,
    user_id: user.id,
    share_type: shareType,
    target_community_id: body.communityId ?? null,
  });
  if (shareInsertError) {
    console.error("[posts/share] ledger:", shareInsertError.message);
  }

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

  return NextResponse.json({
    ok: true,
    share_count: next,
    share_type: shareType,
    repost_id: repostId,
    permalink,
  });
}
