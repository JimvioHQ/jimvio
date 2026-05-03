import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner } from "@/lib/creator-server";
import { CreatorSpacesPageClient } from "@/components/community/creator/CreatorSpacesPageClient";

export const metadata = {
  title: "Spaces",
};

export default async function CreatorSpacesPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await requireCommunityOwner(supabase, user.id, communityId);

  return <CreatorSpacesPageClient communityId={communityId} />;
}
