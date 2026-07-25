// components/community/workspace-context.tsx
"use client";

import React, { createContext, useContext } from "react";
import type { CommunityOverviewStats } from "@/services/community/hub-data";
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
  /** Owner Console permission_config (Channel posting policy). */
  permission_config?: unknown;
  behavior_config?: unknown;
  /** Owner Console channel_kind (template product type). */
  channel_kind?: string | null;
  /** Current user's room_staff role, if any. */
  channel_staff_role?: "moderator" | "admin" | "publisher" | null;
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

// ── New: live now sessions surfaced in sidebar ─────────────────────
export type LiveSessionLite = {
  id: string;
  title: string;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  viewer_count: number;
  room_id: string | null;
  space_id: string | null;
  started_at: string;
};

// ── New: gamification snapshot ─────────────────────────────────────
export type PointsSnapshot = {
  total_points: number;
  level: number;
  level_start_xp: number;
  next_level_xp: number;
  streak_days: number;
};

export type WorkspaceContextValue = {
  slug: string;
  communityId: string;
  communityName: string;
  ownerId: string;
  ownerName: string | null;
  memberCount: number;
  avatarUrl: string | null;
  coverUrl: string | null;
  tagline: string | null;
  isPrivate: boolean;
  joinedAt: string | null;
  userId: string;
  currentUserId: string;
  view: "member" | "admin";
  isAdmin: boolean;
  isOwner: boolean;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  membership: MembershipLite | null;
  spacesWithRooms: WorkspaceSpaceRow[];
  points: PointsSnapshot | null;
  overview: CommunityOverviewStats | null;
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

/** Returns null when rendered outside WorkspaceProvider (e.g. hub chrome). */
export function useWorkspaceOptional() {
  return useContext(WorkspaceContext);
}