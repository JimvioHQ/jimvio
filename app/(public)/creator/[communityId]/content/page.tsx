import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner } from "@/lib/creator-server";
import { CreatorContentPageClient } from "@/components/community/creator/CreatorContentPageClient";

export const metadata = {
  title: "Content",
};

export default async function CreatorContentPage({ params }: { params: Promise<{ communityId: string }> }) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await requireCommunityOwner(supabase, user.id, communityId);

  return <CreatorContentPageClient communityId={communityId} />;
}
