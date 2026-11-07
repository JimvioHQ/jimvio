"use client";

import { AppTopNav } from "./AppTopNav";
import { PrimarySidebar, type SidebarItem } from "./PrimarySidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  activeSidebarItem?: SidebarItem;
  showUtilityBar?: boolean;
  rightRail?: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
    level?: number;
    role?: string;
    verified?: boolean;
    xp?: number;
    xpGoal?: number;
  };
};

export function DashboardShell({
  children,
  activeSidebarItem = "feed",
  showUtilityBar = false,
  rightRail,
  user,
}: DashboardShellProps) {
  const sidebarUser = user
    ? {
        name: user.name,
        avatarUrl: user.avatarUrl,
        level: user.level ?? 1,
        role: user.role ?? "Member",
        verified: user.verified,
        xp: user.xp ?? 0,
        xpGoal: user.xpGoal ?? 1000,
      }
    : undefined;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
      <AppTopNav showUtilityBar={showUtilityBar} user={user} />

      <div className="flex min-h-0 flex-1">
        <PrimarySidebar activeItem={activeSidebarItem} user={sidebarUser} />

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex max-w-[1600px] gap-5 p-4 lg:p-5">
            <div className="min-w-0 flex-1">{children}</div>
            {rightRail && (
              <aside className="hidden w-[360px] shrink-0 space-y-4 xl:block">{rightRail}</aside>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
