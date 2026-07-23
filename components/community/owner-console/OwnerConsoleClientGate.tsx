"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  useOwnerConsoleUiStore,
  type OwnerCommunitySummary,
  type OwnerConsoleBadges,
} from "@/lib/community/owner-console";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import { OwnerConsoleLayout } from "./OwnerConsoleLayout";

export function OwnerConsoleClientGate({
  communities,
  userId,
  userName,
  userAvatar,
  badges,
  children,
}: {
  communities: OwnerCommunitySummary[];
  userId: string;
  userName: string;
  userAvatar: string | null;
  badges: OwnerConsoleBadges;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const storedId = useOwnerConsoleUiStore((s) => s.selectedCommunityId);
  const setSelected = useOwnerConsoleUiStore((s) => s.setSelectedCommunityId);

  const community = useMemo(() => {
    const fromQuery = searchParams.get("community");
    return (
      communities.find((c) => c.id === fromQuery) ||
      communities.find((c) => c.id === storedId) ||
      communities[0] ||
      null
    );
  }, [communities, searchParams, storedId]);

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
