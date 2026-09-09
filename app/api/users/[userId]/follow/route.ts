import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/users/[userId]/follow
 * → { following: boolean, followerCount: number }
 *
 * POST /api/users/[userId]/follow
 * Body optional: { action?: "follow" | "unfollow" | "toggle" }
 * → { following: boolean, followerCount: number, action: "followed" | "unfollowed" }
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: targetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: profile } = await db
    .from("profiles")
    .select("id, username, follower_count")
    .eq("id", targetId)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let following = false;
  if (user && user.id !== targetId) {
    const { data: row } = await db
      .from("user_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetId)
      .maybeSingle();
    following = Boolean(row?.id);
  }

  const { resolveProfileFollowerCount } = await import(
    "@/lib/community/follower-count"
  );

  return NextResponse.json({
    following,
    followerCount: resolveProfileFollowerCount({
      username: profile.username,
      follower_count: profile.follower_count,
    }),
    realFollowerCount: Number(profile.follower_count ?? 0),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: targetId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.id === targetId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
  }

  const limited = rateLimit(`user-follow:${user.id}`, 60, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "follow" | "unfollow" | "toggle";
  };
  const action = body.action ?? "toggle";

  const admin = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: profile } = await db
    .from("profiles")
    .select("id, username, follower_count")
    .eq("id", targetId)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: existing } = await db
    .from("user_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", targetId)
    .maybeSingle();

  const wantFollow =
    action === "follow" ? true : action === "unfollow" ? false : !existing;

  if (wantFollow && !existing) {
    const { error } = await db.from("user_follows").insert({
      follower_id: user.id,
      following_id: targetId,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else if (!wantFollow && existing) {
    const { error } = await db
      .from("user_follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const { data: updated } = await db
    .from("profiles")
    .select("follower_count, username")
    .eq("id", targetId)
    .maybeSingle();

  const { resolveProfileFollowerCount } = await import(
    "@/lib/community/follower-count"
  );
  const real = Number(updated?.follower_count ?? profile.follower_count ?? 0);

  return NextResponse.json({
    following: wantFollow,
    followerCount: resolveProfileFollowerCount({
      username: updated?.username ?? profile.username,
      follower_count: real,
    }),
    realFollowerCount: real,
    action: wantFollow ? "followed" : "unfollowed",
  });
}
