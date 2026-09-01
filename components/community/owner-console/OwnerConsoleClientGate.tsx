"use client";

import { useEffect, useMemo } from "react";
import {
  communityConsoleHref,
  useOwnerConsoleUiStore,
  type OwnerCommunitySummary,
  type OwnerConsoleBadges,
  type CommunityConsoleMode,
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
  consoleMode = "owner",
  children,
}: {
  communities: OwnerCommunitySummary[];
  /** Active community from the URL path. */
  communitySlug: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  badges: OwnerConsoleBadges;
  consoleMode?: CommunityConsoleMode;
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

  const hrefSection = useMemo(
    () => (section = "", query?: Record<string, string | undefined | null>) => {
      if (!community?.slug) return "/owner/communities";
      return communityConsoleHref(community.slug, section, {
        mode: consoleMode,
        query,
      });
    },
    [community?.slug, consoleMode]
  );

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
        consoleMode,
        hrefSection,
      }}
    >
      {children}
    </OwnerConsoleLayout>
  );
}
