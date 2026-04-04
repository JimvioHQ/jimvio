import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getUGCFeed, createUGCPost } from "@/services/ugc";

// ─────────────────────────────────────────────────────────────
// Rate limit store (in-memory, per-process; use Redis in production)
// ─────────────────────────────────────────────────────────────
const postRateLimit = new Map<string, number[]>(); // userId -> [timestamps]
const MAX_POSTS_PER_HOUR = 10;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const timestamps = (postRateLimit.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (timestamps.length >= MAX_POSTS_PER_HOUR) return true;
  postRateLimit.set(userId, [...timestamps, now]);
  return false;
}

// ─────────────────────────────────────────────────────────────
// GET /api/ugc/posts?sort=latest&limit=20&offset=0&hashtag=&productId=
// ─────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const sort = (searchParams.get("sort") ?? "latest") as "latest" | "trending" | "top";
    const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
    const offset = Number(searchParams.get("offset") ?? 0);
    const hashtag = searchParams.get("hashtag") ?? undefined;
    const productId = searchParams.get("productId") ?? undefined;

    const result = await getUGCFeed({ sort, limit, offset, hashtag, productId });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/ugc/posts — Create a new UGC post
// ─────────────────────────────────────────────────────────────
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

    // Rate limiting
    if (isRateLimited(user.id)) {
      return NextResponse.json({ error: "Too many posts. Try again later." }, { status: 429 });
    }

    const body = await req.json();
    const { caption, media = [], postType = "post", productIds = [], hashtags = [] } = body;

    // Validation
    if (!caption && media.length === 0) {
      return NextResponse.json({ error: "Post must have caption or media." }, { status: 400 });
    }
    if (caption && caption.length > 2200) {
      return NextResponse.json({ error: "Caption too long (max 2200 chars)." }, { status: 400 });
    }
    if (media.length > 10) {
      return NextResponse.json({ error: "Max 10 media items per post." }, { status: 400 });
    }
    if (productIds.length > 5) {
      return NextResponse.json({ error: "Max 5 product tags per post." }, { status: 400 });
    }
    if (hashtags.length > 30) {
      return NextResponse.json({ error: "Max 30 hashtags per post." }, { status: 400 });
    }

    const post = await createUGCPost({
      userId: user.id,
      caption,
      media,
      postType,
      productIds,
      hashtags,
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
