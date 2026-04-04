"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkspaceProvider, type WorkspaceContextValue } from "@/components/community/workspace-context";
import { WorkspaceSidebar } from "@/components/community/WorkspaceSidebar";
import { CallProvider } from "@/components/community/call-context";
import type { MembershipLite } from "@/lib/community-workspace-access";


type ShellProps = {
  slug: string;
  community: {
    id: string;
    name: string;
    slug: string;
    avatar_url: string | null;
    member_count: number | null;
    owner_id: string;
  };
  membership: MembershipLite | null;
  userId: string;
  profile: { full_name: string | null; avatar_url: string | null; username: string | null } | null;
  points: { total_points: number; level: number } | null;
  spacesWithRooms: WorkspaceContextValue["spacesWithRooms"];
  children: React.ReactNode;
};

export function WorkspaceShell({
  slug,
  community,
  membership,
  userId,
  profile,
  points,
  spacesWithRooms,
  children,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctx: WorkspaceContextValue = {
    slug,
    communityId: community.id,
    communityName: community.name,
    ownerId: community.owner_id,
    memberCount: community.member_count ?? 0,
    avatarUrl: community.avatar_url,
    userId,
    profile,
    membership,
    spacesWithRooms,
    points: points ?? null,
  };

  const pts = points?.total_points ?? 0;
  const lvl = points?.level ?? 1;

  return (
    <WorkspaceProvider value={ctx}>
      <CallProvider>
        <div className="relative flex w-full min-h-[calc(100vh-var(--navbar-height))] bg-[var(--color-bg)]">

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            style={{ top: "var(--navbar-height)" }}
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <WorkspaceSidebar
          slug={slug}
          communityName={community.name}
          avatarUrl={community.avatar_url}
          memberCount={community.member_count ?? 0}
          ownerId={community.owner_id}
          userId={userId}
          membership={membership}
          profile={profile}
          points={points}
          spaces={spacesWithRooms}
          mobileOpen={mobileOpen}
          onNavigate={() => setMobileOpen(false)}
        />

        <div className="flex flex-1 flex-col min-w-0 lg:ml-0">
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <span className="text-sm font-black text-[var(--color-text-primary)] truncate">{community.name}</span>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">{children}</div>

          <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 flex items-center gap-2 lg:hidden">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-secondary)] shrink-0">
              {profile?.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={32} height={32} className="object-cover h-full w-full" unoptimized />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-xs font-black text-[var(--color-accent)]">
                  {(profile?.full_name || profile?.username || "?")[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">
                {profile?.full_name || profile?.username || "Member"}
              </p>
              <p className="text-[10px] font-black text-[var(--color-accent)]">
                {pts.toLocaleString()} pts · Lvl {lvl}
              </p>
            </div>
          </div>
        </div>
        </div>
      </CallProvider>
    </WorkspaceProvider>
  );
}
