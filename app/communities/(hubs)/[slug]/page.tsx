import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  CommunityDetailView,
  type CommunityDetailPayload,
  type MembershipPayload,
} from "@/components/community/community-detail-view";
import { HubCommunityOverview } from "@/components/community/hub/hub-community-overview";
import { loadCommunityWorkspace } from "@/lib/community/load-community-workspace";
import { constructMetadata, truncateDescription } from "@/lib/seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";

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

  const image = data.cover_image ?? data.avatar_url ?? undefined;
  return constructMetadata({
    title: data.name,
    description: truncateDescription(
      data.tagline ?? `${data.name} on Jimvio.`
    ),
    image,
    path: `/communities/${slug}`,
  });
}

async function loadPublicCommunity(slug: string): Promise<CommunityDetailPayload | null> {
  const supabase = await createClient();
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

  if (!community) return null;

  const oneWeekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [recentMembersRes, courseCountRes, lessonCountRes, postsLastWeekRes, lastPostRes] =
    await Promise.all([
      supabase
        .from("community_memberships")
        .select("profiles ( id, full_name, avatar_url )")
        .eq("community_id", community.id)
        .eq("status", "active")
        .order("subscribed_at", { ascending: false, nullsFirst: false })
        .limit(8),
      supabase
        .from("community_courses")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id)
        .eq("is_published", true),
      supabase
        .from("community_courses")
        .select("total_lessons")
        .eq("community_id", community.id)
        .eq("is_published", true),
      supabase
        .from("community_posts")
        .select("id", { count: "exact", head: true })
        .eq("community_id", community.id)
        .eq("is_published", true)
        .gte("created_at", oneWeekAgo),
      supabase
        .from("community_posts")
        .select("created_at")
        .eq("community_id", community.id)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const recent_members = (recentMembersRes.data ?? [])
    .map((row: { profiles: unknown }) => row.profiles)
    .filter(
      (p): p is { id: string; full_name: string | null; avatar_url: string | null } =>
        !!p && typeof p === "object" && "id" in p && typeof (p as { id: unknown }).id === "string"
    );

  const lesson_count = (lessonCountRes.data ?? []).reduce(
    (sum, c) => sum + (c.total_lessons ?? 0),
    0
  );

  return {
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
}

export default async function CommunitySlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = user ? await loadCommunityWorkspace(slug) : null;
  if (payload?.membership?.status === "active") {
    return <HubCommunityOverview />;
  }

  const community = await loadPublicCommunity(slug);
  if (!community) notFound();

  let membership: MembershipPayload = null;
  if (user) {
    const { data } = await supabase
      .from("community_memberships")
      .select("id, status, role, created_at, subscribed_at, expires_at, plan_type")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    membership = data as MembershipPayload;
  }

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Communities", path: "/communities" },
          { name: community.name, path: `/communities/${slug}` },
        ]}
      />
      <CommunityDetailView
        community={community}
        membership={membership}
        isLoggedIn={!!user}
      />
    </>
  );
}
