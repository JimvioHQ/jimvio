"use client";

import { useEffect, useMemo } from "react";
import {
  useOwnerConsoleUiStore,
  type OwnerCommunitySummary,
  type OwnerConsoleBadges,
} from "@/lib/community/owner-console";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { OwnerConsoleLayout } from "./OwnerConsoleLayout";

export function OwnerConsoleClientGate({
  communities,
  communitySlug,
  userId,
  userName,
  userAvatar,
  badges,
  children,
}: {
  communities: OwnerCommunitySummary[];
  /** Active community from the URL path. */
  communitySlug: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  badges: OwnerConsoleBadges;
  children: React.ReactNode;
}) {
  const storedId = useOwnerConsoleUiStore((s) => s.selectedCommunityId);
  const setSelected = useOwnerConsoleUiStore((s) => s.setSelectedCommunityId);

  const community = useMemo(() => {
    return (
      communities.find((c) => c.slug === communitySlug) ||
      communities.find((c) => c.id === storedId) ||
      communities[0] ||
      null
    );
  }, [communities, communitySlug, storedId]);

  useEffect(() => {
    if (community && community.id !== storedId) {
      setSelected(community.id);
    }
  }, [community, storedId, setSelected]);

  const role: WorkspaceRole = community?.role ?? "guest";

  return (
    <OwnerConsoleLayout
      value={{
        communities,
        community,
        role,
        userId,
        userName,
        userAvatar,
        badges,
        workspaceHref: community ? `/communities/${community.slug}` : null,
      }}
    >
      {children}
    </OwnerConsoleLayout>
  );
}
