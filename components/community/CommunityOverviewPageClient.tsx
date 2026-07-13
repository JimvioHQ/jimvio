"use client";

import { WorkspaceProvider } from "@/components/community/workspace-context";
import { CommunityOverviewPage } from "./CommunityOverviewPage";
import type { CommunityWorkspacePayload } from "@/lib/community/load-community-workspace";

type Props = {
  payload: CommunityWorkspacePayload;
};

export function CommunityOverviewPageClient({ payload }: Props) {
  const { community, currentUserId, membership, isOwner, isAdmin, profile, points, spacesWithRooms, overview, ownerName } = payload;

  const ctx = {
    slug: community.slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count ?? 0,
    avatarUrl: community.avatar_url,
    coverImage: community.cover_image,
    userId: currentUserId,
    currentUserId,
    view: "member",
    isAdmin,
    isOwner,
    profile,
    membership: membership
      ? {
          role: membership.role,
          status: membership.status,
          plan_type: membership.plan_type,
          space_access: membership.space_access,
          created_at: membership.created_at,
        }
      : null,
    spacesWithRooms,
    points,
    overview,
  };

  return (
    <WorkspaceProvider value={ctx}>
      <CommunityOverviewPage slug={community.slug} />
    </WorkspaceProvider>
  );
}