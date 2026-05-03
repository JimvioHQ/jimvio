import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner } from "@/lib/creator-server";
import { CreatorMembersPageClient } from "@/components/community/creator/CreatorMembersPageClient";
import { normalizeMemberRows } from "@/lib/creator-member-rows";

export const metadata = {
  title: "Members",
};

export default async function CreatorMembersPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await requireCommunityOwner(supabase, user.id, communityId);

  const { data: rows } = await supabase
    .from("community_memberships")
    .select("id, user_id, plan_type, status, created_at, amount_paid, profiles(email, full_name, avatar_url, username)")
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  return <CreatorMembersPageClient communityId={communityId} initialRows={normalizeMemberRows(rows ?? [])} />;
}
