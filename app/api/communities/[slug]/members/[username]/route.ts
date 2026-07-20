import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Member profile for a community — resolve by username or user id.
 * GET /api/communities/[slug]/members/[username]
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; username: string }> }
) {
  const { slug, username: usernameOrId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: community } = await supabase
    .from("communities")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const { data: myMembership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!myMembership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const admin = createServiceRoleClient();

  let profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    bio?: string | null;
  } | null = null;

  if (UUID_RE.test(usernameOrId)) {
    const { data: p } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, username, bio")
      .eq("id", usernameOrId)
      .maybeSingle();
    profile = p;
  } else {
    const { data: p } = await admin
      .from("profiles")
      .select("id, full_name, avatar_url, username, bio")
      .eq("username", usernameOrId)
      .maybeSingle();
    profile = p;
  }

  if (!profile) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const { data: membership } = await admin
    .from("community_memberships")
    .select("user_id, role, created_at, subscribed_at")
    .eq("community_id", community.id)
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member of this community" }, { status: 404 });

  const { data: points } = await admin
    .from("member_points")
    .select("total_points, level, streak_days")
    .eq("community_id", community.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const { data: posts } = await admin
    .from("community_posts")
    .select("id, title, body, created_at, like_count, comment_count, room_id")
    .eq("community_id", community.id)
    .eq("author_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(10);

  return NextResponse.json({
    member: {
      user_id: profile.id,
      role: membership.role ?? "member",
      joined_at: membership.subscribed_at ?? membership.created_at,
      profile: {
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        username: profile.username,
        bio: profile.bio ?? null,
      },
      points: points
        ? {
            total_points: points.total_points ?? 0,
            level: points.level ?? 1,
            streak_days: points.streak_days ?? 0,
          }
        : null,
      recent_posts: (posts ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        created_at: p.created_at,
        like_count: p.like_count ?? 0,
        comment_count: p.comment_count ?? 0,
      })),
    },
    community: { id: community.id, slug: community.slug, name: community.name },
  });
}
