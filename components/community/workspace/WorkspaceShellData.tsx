"use client";

import { useSearchParams } from "next/navigation";
import type { WorkspaceCommunity, WorkspaceRole, WorkspaceSection } from "@/types/workspace";
import type { WorkspaceSpaceRow, PointsSnapshot } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { WorkspaceLayout } from "./WorkspaceShell";

interface WorkspaceShellDataProps {
  community: WorkspaceCommunity;
  currentUserId: string;
  role: WorkspaceRole;
  isAdmin: boolean;
  isOwner: boolean;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: PointsSnapshot | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  unreadNotifications: number;
  openMissionsCount: number;
  membership: MembershipLite | null;
  children: React.ReactNode;
}

export function WorkspaceShellData({
  community,
  currentUserId,
  role,
  isAdmin,
  isOwner,
  profile,
  points,
  spacesWithRooms,
  unreadNotifications,
  openMissionsCount,
  membership,
  children,
}: WorkspaceShellDataProps) {
  const searchParams = useSearchParams();
  const params = Object.fromEntries(searchParams);
  const { section = "feed", view = "member" } = params;

  return (
    <WorkspaceLayout
      community={community}
      currentUserId={currentUserId}
      role={role}
      isAdmin={isAdmin}
      isOwner={isOwner}
      initialView={view === "admin" && isAdmin ? "admin" : "member"}
      profile={profile}
      points={points}
      spacesWithRooms={spacesWithRooms}
      membership={membership}
    >
      {children}
    </WorkspaceLayout>
  );
}