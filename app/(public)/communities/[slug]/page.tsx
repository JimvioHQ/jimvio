import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityDetailView } from "@/components/community/community-detail-view";

/** Membership must reflect the current session after join — avoid stale cached RSC data. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("communities")
    .select("name, tagline")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return { title: "Community" };
  return {
    title: data.name,
    description: data.tagline ?? undefined,
  };
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select(
      `
      *,
      profiles!communities_owner_id_fkey ( id, full_name, avatar_url, username )
    `
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let membership = null;
  if (user) {
    const { data: m } = await supabase
      .from("community_memberships")
      .select("id, status, created_at, subscribed_at, expires_at, plan_type")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    membership = m;
  }

  return (
    <CommunityDetailView community={community} membership={membership} isLoggedIn={!!user} />
  );
}
