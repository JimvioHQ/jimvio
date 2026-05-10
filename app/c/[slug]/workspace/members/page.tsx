import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { WorkspaceMembersClient } from "@/components/community/workspace-members-client";

export const metadata = {
  title: "Members",
};

export default async function WorkspaceMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/communities/${slug}/workspace/members`)}`);
  }

  const { data: community } = await supabase
    .from("communities")
    .select("id")
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

  if (!myMembership) {
    redirect(`/communities/${slug}`);
  }

  // Source of truth for "who is in this community" is community_memberships. member_points rows
  // may not exist until points are awarded; RLS also only allows users to read their own membership
  // row (not the full directory), so we load the list with the service role after the gate above.
  const admin = createServiceRoleClient();

  const { data: membershipRows } = await admin
    .from("community_memberships")
    .select("user_id, role, created_at")
    .eq("community_id", community.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(200);

  const ids = (membershipRows ?? []).map((r) => r.user_id);
  let profiles: { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[] = [];
  if (ids.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, full_name, avatar_url, username").in("id", ids);
    profiles = p ?? [];
  }

  const pointsMap = new Map<string, { total_points: number; level: number }>();
  if (ids.length > 0) {
    const { data: pRows } = await admin
      .from("member_points")
      .select("user_id, total_points, level")
      .eq("community_id", community.id)
      .in("user_id", ids);
    for (const pr of pRows ?? []) {
      pointsMap.set(pr.user_id, {
        total_points: pr.total_points ?? 0,
        level: pr.level ?? 1,
      });
    }
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const members = (membershipRows ?? []).map((r) => {
    const pts = pointsMap.get(r.user_id);
    return {
      user_id: r.user_id,
      role: r.role ?? "member",
      total_points: pts?.total_points ?? 0,
      level: pts?.level ?? 1,
      joined_at: r.created_at,
      profile: profileMap.get(r.user_id) ?? null,
    };
  });

  members.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    const an = (a.profile?.full_name || a.profile?.username || "").toLowerCase();
    const bn = (b.profile?.full_name || b.profile?.username || "").toLowerCase();
    return an.localeCompare(bn);
  });

  return <WorkspaceMembersClient slug={slug} members={members} />;
}
