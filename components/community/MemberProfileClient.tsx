"use client";

import { useState } from "react";
import { CommunityInboxDialog } from "@/components/community/chat/community-inbox-dialog";
import {
  MemberProfilePanel,
  type MemberProfileData,
} from "@/components/community/MemberProfilePanel";

export function MemberProfileClient({
  slug,
  communityName,
  member,
  currentUserId,
}: {
  slug: string;
  communityId?: string;
  communityName: string;
  member: MemberProfileData;
  currentUserId: string;
}) {
  const [inboxOpen, setInboxOpen] = useState(false);
  const name = member.profile.full_name || member.profile.username || "Member";

  return (
    <>
      <MemberProfilePanel
        slug={slug}
        member={member}
        communityName={communityName}
        currentUserId={currentUserId}
        onMessage={() => setInboxOpen(true)}
      />
      {/* Inbox API path uses community slug (see app/api/communities/[slug]/inbox). */}
      <CommunityInboxDialog
        open={inboxOpen}
        onOpenChange={setInboxOpen}
        communityId={slug}
        peerUserId={member.user_id}
        peerName={name}
        peerAvatarUrl={member.profile.avatar_url}
        currentUserId={currentUserId}
      />
    </>
  );
}
