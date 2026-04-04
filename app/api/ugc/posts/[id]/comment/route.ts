import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { addUGCComment, getUGCComments, deleteUGCComment } from "@/services/ugc";

type Params = { params: Promise<{ id: string }> };

// Rate limit: max 20 comments per minute per user
const commentRateLimit = new Map<string, number[]>();
function isCommentRateLimited(userId: string): boolean {
  const now = Date.now();
  const ts = (commentRateLimit.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (ts.length >= 20) return true;
  commentRateLimit.set(userId, [...ts, now]);
  return false;
}

async function getUser(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") ?? 30), 100);
  const offset = Number(searchParams.get("offset") ?? 0);
  const comments = await getUGCComments(id, limit, offset);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const user = await getUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isCommentRateLimited(user.id)) {
      return NextResponse.json({ error: "Too many comments. Slow down." }, { status: 429 });
    }

    const { body, parentId } = await req.json();
    if (!body || body.trim().length < 1) {
      return NextResponse.json({ error: "Comment cannot be empty." }, { status: 400 });
    }
    if (body.length > 2000) {
      return NextResponse.json({ error: "Comment too long (max 2000 chars)." }, { status: 400 });
    }

    const comment = await addUGCComment(id, user.id, body, parentId);
    return NextResponse.json({ comment }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id: postId } = await params;
    const { commentId } = await req.json();
    const cookieStore = await cookies();
    const user = await getUser(cookieStore);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await deleteUGCComment(commentId, user.id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
