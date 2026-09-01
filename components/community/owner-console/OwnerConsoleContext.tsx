"use client";

import { createContext, useContext } from "react";
import type { WorkspaceRole } from "@/lib/community/workspace/types";
import type {
  OwnerCommunitySummary,
  OwnerConsoleBadges,
  CommunityConsoleMode,
} from "@/lib/community/owner-console";

export type OwnerConsoleContextValue = {
  communities: OwnerCommunitySummary[];
  community: OwnerCommunitySummary | null;
  role: WorkspaceRole;
  userId: string;
  userName: string;
  userAvatar: string | null;
  badges: OwnerConsoleBadges;
  workspaceHref: string | null;
  consoleMode: CommunityConsoleMode;
  hrefSection: (
    section?: string,
    query?: Record<string, string | undefined | null>
  ) => string;
};

const OwnerConsoleContext = createContext<OwnerConsoleContextValue | null>(null);

export function OwnerConsoleProvider({
  value,
  children,
}: {
  value: OwnerConsoleContextValue;
  children: React.ReactNode;
}) {
  return (
    <OwnerConsoleContext.Provider value={value}>
      {children}
    </OwnerConsoleContext.Provider>
  );
}

export function useOwnerConsole() {
  const ctx = useContext(OwnerConsoleContext);
  if (!ctx) {
    throw new Error("useOwnerConsole must be used within OwnerConsoleProvider");
  }
  return ctx;
}

export function useOwnerConsoleOptional() {
  return useContext(OwnerConsoleContext);
}
