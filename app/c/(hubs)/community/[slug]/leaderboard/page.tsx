import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceLeaderboardClient } from "@/components/community/workspace-leaderboard-client";

export const metadata = {
  title: "Leaderboard",
};

export default async function WorkspaceLeaderboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: community } = await supabase
    .from("communities")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const { data: rows } = await supabase
    .from("member_points")
    .select("user_id, total_points, level, last_active_at, created_at")
    .eq("community_id", community.id)
    .order("total_points", { ascending: false })
    .limit(500);

  const ids = (rows ?? []).map((r) => r.user_id);
  let profiles: { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[] = [];
  if (ids.length > 0) {
    const { data: p } = await supabase.from("profiles").select("id, full_name, avatar_url, username").in("id", ids);
    profiles = p ?? [];
  }
  const map = new Map(profiles.map((p) => [p.id, p]));
  const leaderboardRows = (rows ?? []).map((r) => ({
    user_id: r.user_id,
    total_points: r.total_points ?? 0,
    level: r.level ?? 1,
    last_active_at: r.last_active_at,
    created_at: r.created_at,
    profile: map.get(r.user_id) ?? null,
  }));

  return <WorkspaceLeaderboardClient rows={leaderboardRows} currentUserId={user?.id ?? ""} />;
}
