import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST — mark a review as helpful once per user (atomic via vote_review_helpful). */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: review } = await supabase
    .from("reviews")
    .select("id, helpful_count")
    .eq("id", reviewId)
    .maybeSingle();

  if (!review) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: helpfulCount, error } = await (supabase as any).rpc("vote_review_helpful", {
    p_review_id: reviewId,
  });

  if (error) {
    // Fallback if migration not applied yet — still avoid unbounded client writes
    const { data: existing } = await (supabase as any)
      .from("review_helpful_votes")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        ok: true,
        helpful_count: review.helpful_count ?? 0,
        alreadyVoted: true,
      });
    }

    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    helpful_count: Number(helpfulCount ?? review.helpful_count ?? 0),
  });
}
