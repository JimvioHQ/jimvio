import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireCommunityOwner, countOwnedCommunities } from "@/lib/creator-server";
import { CreatorNav } from "@/components/community/creator/CreatorNav";

export default async function CreatorCommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ communityId: string }>;
}) {
  const { communityId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/creator/${communityId}/dashboard`)}`);
  }

  const owned = await countOwnedCommunities(supabase, user.id);
  if (owned === 0) {
    redirect("/communities/create");
  }

  const community = await requireCommunityOwner(supabase, user.id, communityId);

  return (
    <div className="min-h-[calc(100vh-var(--navbar-height))] bg-[var(--color-bg)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 py-6 lg:py-10 flex flex-col lg:flex-row gap-6 lg:gap-10">
        <CreatorNav
          communityId={community.id}
          slug={community.slug}
          name={community.name}
          avatarUrl={community.avatar_url}
        />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
