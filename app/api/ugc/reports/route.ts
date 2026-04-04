import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { reportContent } from "@/services/ugc";

const VALID_REASONS = ["spam", "hate_speech", "misinformation", "nudity", "violence", "copyright", "fraud", "other"];

// Rate limit: max 5 reports per user per hour
const reportRateLimit = new Map<string, number[]>();
function isReportRateLimited(userId: string): boolean {
  const now = Date.now();
  const ts = (reportRateLimit.get(userId) ?? []).filter((t) => now - t < 3_600_000);
  if (ts.length >= 5) return true;
  reportRateLimit.set(userId, [...ts, now]);
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isReportRateLimited(user.id)) {
      return NextResponse.json({ error: "Too many reports. Try again later." }, { status: 429 });
    }

    const { reason, details, postId, clipId, commentId } = await req.json();
    if (!VALID_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason." }, { status: 400 });
    }
    if (!postId && !clipId && !commentId) {
      return NextResponse.json({ error: "Must specify what to report." }, { status: 400 });
    }

    const report = await reportContent({
      reporterId: user.id,
      reason,
      details: details?.slice(0, 500),
      postId,
      clipId,
      commentId,
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
