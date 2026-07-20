import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { MemberProfileClient } from "@/components/community/MemberProfileClient";

export const metadata = { title: "Member" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function CommunityMemberProfilePage({
  params,
}: {
  params: Promise<{ slug: string; username: string }>;
}) {
  const { slug, username: usernameOrId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/communities/${slug}/members/${usernameOrId}`)}`
    );
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const { data: myMembership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", community.id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!myMembership) redirect(`/communities/${slug}`);

  const admin = createServiceRoleClient();

  let profile: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    bio: string | null;
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

  if (!profile) notFound();

  const { data: membership } = await admin
    .from("community_memberships")
    .select("user_id, role, created_at, subscribed_at")
    .eq("community_id", community.id)
    .eq("user_id", profile.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) notFound();

  const { data: points } = await admin
    .from("member_points")
    .select("total_points, level, streak_days")
    .eq("community_id", community.id)
    .eq("user_id", profile.id)
    .maybeSingle();

  const { data: posts } = await admin
    .from("community_posts")
    .select("id, title, body, created_at, like_count, comment_count")
    .eq("community_id", community.id)
    .eq("author_id", profile.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(10);

  const member = {
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
  };

  return (
    <MemberProfileClient
      slug={slug}
      communityId={community.id}
      communityName={community.name}
      member={member}
      currentUserId={user.id}
    />
  );
}
