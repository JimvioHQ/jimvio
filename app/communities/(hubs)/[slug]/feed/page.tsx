import { FeedSection } from "@/components/community/workspace/sections/Feed";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { buildHubLoginUrl } from "@/lib/community/hub-auth";
import { resolveCommunityJoinVisibility } from "@/lib/community/join-policy";

export const dynamic = "force-dynamic";

export default async function CommunityFeedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: community } = await supabase
    .from("communities")
    .select("id, name, slug, is_private, owner_id, visibility, visibility_mode, is_active, archived_at")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (!community) notFound();

  const restricted = resolveCommunityJoinVisibility(community) !== "public";
  if (restricted) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const next = `/communities/${slug}/feed`;
    if (!user) redirect(buildHubLoginUrl(next));

    const isOwner = community.owner_id === user.id;
    const { data: membership } = await supabase
      .from("community_memberships")
      .select("status, role")
      .eq("community_id", community.id)
      .eq("user_id", user.id)
      .maybeSingle();
    const memberOk =
      isOwner || (membership?.status === "active" && Boolean(membership.role));
    if (!memberOk) redirect(`/communities/${slug}`);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4">
        <FeedSection communityId={community.id} />
      </div>
    </div>
  );
}
