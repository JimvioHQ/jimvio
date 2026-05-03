import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

/** Active members + profiles for sidebar / messaging (same pattern as workspace members page). */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: myMembership } = await supabase
    .from("community_memberships")
    .select("user_id")
    .eq("community_id", communityId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!myMembership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const admin = createServiceRoleClient();
  const { data: membershipRows, error } = await admin
    .from("community_memberships")
    .select("user_id, role")
    .eq("community_id", communityId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = (membershipRows ?? []).map((r) => r.user_id);
  let profiles: { id: string; full_name: string | null; avatar_url: string | null; username: string | null }[] = [];
  if (ids.length > 0) {
    const { data: p } = await admin.from("profiles").select("id, full_name, avatar_url, username").in("id", ids);
    profiles = p ?? [];
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const members = (membershipRows ?? []).map((r) => ({
    user_id: r.user_id,
    role: r.role ?? "member",
    profile: profileMap.get(r.user_id) ?? null,
  }));

  members.sort((a, b) => {
    const an = (a.profile?.full_name || a.profile?.username || "").toLowerCase();
    const bn = (b.profile?.full_name || b.profile?.username || "").toLowerCase();
    return an.localeCompare(bn);
  });

  return NextResponse.json({ members });
}
