"use client";

import { useWorkspace } from "@/components/community/workspace-context";
import { SpacesSection } from "@/components/community/workspace/sections/SpacesSection";

/**
 * Client wrapper: renders Spaces for the current community only.
 */
export function CommunitySpacesGallery() {
  const {
    communityId,
    slug,
    communityName,
    avatarUrl,
    coverUrl,
    memberCount,
    ownerId,
    spacesWithRooms,
    isAdmin,
    isOwner,
  } = useWorkspace();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-[#f7f8fa]">
      <SpacesSection
        community={{
          id: communityId,
          slug,
          name: communityName,
          avatar_url: avatarUrl,
          cover_image: coverUrl,
          member_count: memberCount,
          owner_id: ownerId,
        }}
        spacesWithRooms={spacesWithRooms}
        isAdmin={isAdmin}
        isOwner={isOwner}
      />
    </div>
  );
}
