import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** POST — mark a review as helpful (increments helpful_count once per user via client optimism). */
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

  const next = (review.helpful_count ?? 0) + 1;
  const { error } = await supabase
    .from("reviews")
    .update({ helpful_count: next })
    .eq("id", reviewId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, helpful_count: next });
}
