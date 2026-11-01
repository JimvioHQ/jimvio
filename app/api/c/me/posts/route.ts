import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedPage = Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
  const requestedLimit = Number.parseInt(req.nextUrl.searchParams.get("limit") ?? String(DEFAULT_PAGE_SIZE), 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit)) : DEFAULT_PAGE_SIZE;
  const offset = (page - 1) * limit;

  // Author ID is the ownership source of truth. No community-owner shortcut is used.
  // Do not filter by community_id: this includes every post authored by the user.
  const { data, error, count } = await supabase
    .from("community_posts")
    .select(
      "id, title, body, post_type, images, attachments, video_url, like_count, comment_count, view_count, is_published, published_at, scheduled_at, created_at, archived_at, hidden_at, community_id, communities(name, slug)",
      { count: "exact" },
    )
    .eq("author_id", user.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const posts = data ?? [];
  const total = count ?? posts.length;
  return NextResponse.json(
    { posts, total, page, limit, hasMore: offset + posts.length < total },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
