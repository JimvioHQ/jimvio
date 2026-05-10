import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CommunityDetailView,
  type CommunityDetailPayload,
  type MembershipPayload,
} from "@/components/community/community-detail-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("name, tagline, avatar_url, cover_image")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return { title: "Community" };
  return {
    title: data.name,
    description: data.tagline ?? undefined,
    openGraph: {
      title: data.name,
      description: data.tagline ?? undefined,
      images: data.cover_image ? [data.cover_image] : data.avatar_url ? [data.avatar_url] : undefined,
    },
  };
}

export default async function CommunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // ── 1. Core community + owner ─────────────────────────────────────
  const { data: community } = await supabase
    .from("communities")
    .select(`
      *,
      owner:profiles!communities_owner_id_fkey (
        id, full_name, avatar_url, username
      )
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  // ── 2. Auth check ─────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── 3. Run all secondary queries in parallel ──────────────────────
  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    membershipRes,
    recentMembersRes,
    courseCountRes,
    lessonCountRes,
    postsLastWeekRes,
    lastPostRes,
  ] = await Promise.all([
    // Membership for current user
    user
      ? supabase
          .from("community_memberships")
          .select("id, status, role, created_at, subscribed_at, expires_at, plan_type")
          .eq("community_id", community.id)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    // Recent members — newest 8 active memberships, joined to profile
    supabase
      .from("community_memberships")
      .select("profiles ( id, full_name, avatar_url )")
      .eq("community_id", community.id)
      .eq("status", "active")
      .order("subscribed_at", { ascending: false, nullsFirst: false })
      .limit(8),

    // Course count
    supabase
      .from("community_courses")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("is_published", true),

    // Lesson count via courses (Supabase doesn't support nested counts directly,
    // so we sum total_lessons from the courses table — already on the schema)
    supabase
      .from("community_courses")
      .select("total_lessons")
      .eq("community_id", community.id)
      .eq("is_published", true),

    // Posts in the last 7 days
    supabase
      .from("community_posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", community.id)
      .eq("is_published", true)
      .gte("created_at", oneWeekAgo),

    // Most recent post timestamp
    supabase
      .from("community_posts")
      .select("created_at")
      .eq("community_id", community.id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // ── 4. Shape the recent_members array ─────────────────────────────
  // Supabase returns { profiles: { ... } } per row; flatten and drop nulls
  const recent_members = (recentMembersRes.data ?? [])
    .map((row: any) => row.profiles)
    .filter(
      (p: any): p is { id: string; full_name: string | null; avatar_url: string | null } =>
        p && p.id
    );

  // ── 5. Sum lesson counts ──────────────────────────────────────────
  const lesson_count = (lessonCountRes.data ?? []).reduce(
    (sum: number, c: any) => sum + (c.total_lessons ?? 0),
    0
  );

  // ── 6. Build the final payload ────────────────────────────────────
  const payload: CommunityDetailPayload = {
    ...community,
    owner: community.owner ?? null,
    recent_members,
    stats: {
      course_count: courseCountRes.count ?? 0,
      lesson_count,
      posts_last_week: postsLastWeekRes.count ?? 0,
      last_post_at: lastPostRes.data?.created_at ?? null,
    },
  };

  return (
    <CommunityDetailView
      community={payload}
      membership={membershipRes.data as MembershipPayload}
      isLoggedIn={!!user}
    />
  );
}