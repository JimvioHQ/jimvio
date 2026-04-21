"use client";

import React, { createContext, useContext } from "react";
import type { MembershipLite } from "@/lib/community-workspace-access";

export type WorkspaceRoomRow = {
  id: string;
  name: string;
  slug: string;
  room_type: string;
  space_id: string;
  is_locked: boolean;
  access_type: string;
  sort_order: number | null;
};

export type WorkspaceSpaceRow = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  access_type: string;
  sort_order: number | null;
  rooms: WorkspaceRoomRow[];
};

export type WorkspaceContextValue = {
  slug: string;
  communityId: string;
  communityName: string;
  ownerId: string;
  memberCount: number;
  avatarUrl: string | null;
  userId: string;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  membership: MembershipLite | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  points: { total_points: number; level: number } | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const v = useContext(WorkspaceContext);
  if (!v) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return v;
}
