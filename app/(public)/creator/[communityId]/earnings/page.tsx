import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner } from "@/lib/creator-server";
import { CreatorEarningsPageClient } from "@/components/community/creator/CreatorEarningsPageClient";

export const metadata = {
  title: "Earnings",
};

export default async function CreatorEarningsPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const community = await requireCommunityOwner(supabase, user.id, communityId);

  return (
    <CreatorEarningsPageClient
      communityId={communityId}
      communityName={community.name}
      displayCurrency={community.currency || "USD"}
    />
  );
}
