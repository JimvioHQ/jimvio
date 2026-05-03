import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type Params = { params: Promise<{ id: string }> };

// Rate limit: max 1 like/unlike per clip per user per 2 seconds
const clipLikeCache = new Map<string, number>();

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { id: clipId } = await params;
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const key = `${user.id}:${clipId}`;
    const lastToggle = clipLikeCache.get(key) ?? 0;
    if (Date.now() - lastToggle < 2000) {
      return NextResponse.json({ error: "Too fast." }, { status: 429 });
    }
    clipLikeCache.set(key, Date.now());

    const db = createServiceRoleClient();

    const { data: existing } = await db
      .from("clip_likes")
      .select("id")
      .eq("clip_id", clipId)
      .eq("user_id", user.id)
      .maybeSingle();

    let liked: boolean;
    if (existing) {
      await db.from("clip_likes").delete().eq("id", existing.id);
      liked = false;
    } else {
      await db.from("clip_likes").insert({ clip_id: clipId, user_id: user.id });
      liked = true;
    }

    return NextResponse.json({ liked });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
