import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { toggleUGCLike } from "@/services/ugc";

type Params = { params: Promise<{ id: string }> };

// Like rate limiter: max 60 likes/min per user
const likeRateLimit = new Map<string, number[]>();
function isLikeRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const ts = (likeRateLimit.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (ts.length >= 60) return true;
  likeRateLimit.set(userId, [...ts, now]);
  return false;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isLikeRateLimited(user.id)) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }

    const result = await toggleUGCLike(id, user.id);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
