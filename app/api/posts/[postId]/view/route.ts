import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canEngageWithCommunityPost } from "@/services/accessControl";

export const dynamic = "force-dynamic";

/**
 * POST — record a qualifying post view (server-deduped).
 * Body: { sessionId?, watchMs?, completionPct?, source? }
 *
 * Auth users: dedupe by user_id + post + UTC day.
 * Guests: require sessionId; dedupe by session_id + post + UTC day.
 * Never trusts client-submitted totals — only increments via SECURITY DEFINER RPC.
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

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    watchMs?: number;
    completionPct?: number;
  };

  const sessionId =
    typeof body.sessionId === "string" ? body.sessionId.trim().slice(0, 80) : "";

  if (!user && !sessionId) {
    return NextResponse.json(
      { ok: false, recorded: false, error: "session required" },
      { status: 400 },
    );
  }

  const { data: post } = await supabase
    .from("community_posts")
    .select("id, room_id, community_id, view_count, is_published, archived_at, hidden_at, deleted_at")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.is_published === false || post.archived_at != null || post.hidden_at != null || post.deleted_at != null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user) {
    const hasAccess = await canEngageWithCommunityPost(user.id, {
      room_id: post.room_id,
      community_id: post.community_id,
    });
    if (!hasAccess) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
  } else {
    // Guests: only public, non-private community posts.
    const { data: community } = await supabase
      .from("communities")
      .select("is_private, is_active")
      .eq("id", post.community_id)
      .maybeSingle();
    if (
      !community ||
      community.is_active === false ||
      community.is_private === true
    ) {
      return NextResponse.json({ error: "No access" }, { status: 403 });
    }
  }

  // Service role executes SECURITY DEFINER RPC (anon cannot call it directly).
  let recorded = false;
  let viewCount: number | null =
    typeof post.view_count === "number" ? post.view_count : null;
  try {
    const admin = createServiceRoleClient();
    const { data, error } = await admin.rpc("record_community_post_view", {
      p_post_id: postId,
      p_user_id: user?.id ?? null,
      p_session_id: user ? null : sessionId,
      p_watch_ms: Math.max(0, Math.floor(Number(body.watchMs ?? 0))),
      p_completion_pct: Math.min(100, Math.max(0, Number(body.completionPct ?? 0))),
    });
    if (error) {
      console.error("[posts/view] rpc failed:", error.message);
      return NextResponse.json(
        { ok: false, recorded: false, view_count: viewCount, error: error.message },
        { status: 200 },
      );
    }
    recorded = Boolean(data);
    const { data: refreshed } = await admin
      .from("community_posts")
      .select("view_count")
      .eq("id", postId)
      .maybeSingle();
    if (typeof refreshed?.view_count === "number") {
      viewCount = refreshed.view_count;
    } else if (recorded && viewCount != null) {
      viewCount += 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "view failed";
    console.error("[posts/view]", message);
    return NextResponse.json(
      { ok: false, recorded: false, view_count: viewCount, error: message },
      { status: 200 },
    );
  }

  return NextResponse.json({
    ok: true,
    recorded,
    view_count: viewCount,
  });
}
