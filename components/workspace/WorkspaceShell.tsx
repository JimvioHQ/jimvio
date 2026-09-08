"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AppTopNav } from "@/components/shell/AppTopNav";
import {
  type WorkspaceId,
  WORKSPACES,
  resolveWorkspaceNavActive,
} from "@/lib/workspace/config";
import { WorkspaceSidebar } from "@/components/workspace/WorkspaceSidebar";
import { WorkspaceRightPanel } from "@/components/workspace/WorkspaceRightPanel";
import { cn } from "@/lib/utils";
import {
  MobilePrimaryBottomNav,
  MOBILE_PRIMARY_BOTTOM_NAV_PAD,
} from "@/components/layout/mobile-primary-bottom-nav";

type WorkspaceShellProps = {
  workspace: WorkspaceId;
  children: React.ReactNode;
  user?: {
    name: string;
    avatarUrl?: string | null;
    isPremium?: boolean;
  };
  showRightPanel?: boolean;
};

export function WorkspaceShell({
  workspace,
  children,
  user,
  showRightPanel = true,
}: WorkspaceShellProps) {
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);
  const def = WORKSPACES[workspace];
  const activeId = resolveWorkspaceNavActive(pathname, workspace);
  const rightPanelEnabled = showRightPanel && !!def.rightPanel && workspace !== "affiliates";

  const isAffiliate = workspace === "affiliates";

  return (
    <div
      className={cn(
        "flex flex-col bg-[var(--color-bg)]",
        // Affiliates: lock shell to viewport so the left nav stays fixed while main scrolls.
        isAffiliate ? "h-dvh overflow-hidden" : "min-h-dvh"
      )}
    >
      <AppTopNav
        showUtilityBar
        activeNav={def.label === "UGC & Clipping" ? "UGC & Clipping" : def.label}
        user={user}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:block",
            isAffiliate
              ? "sticky top-0 h-full w-[232px] self-stretch overflow-hidden"
              : "w-[240px]"
          )}
        >
          <WorkspaceSidebar
            workspace={workspace}
            activeId={activeId}
          />
        </aside>

        {mobileNav ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileNav(false)}
            />
            <aside className="relative h-full w-[min(280px,85vw)] border-r border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                  {def.label}
                </span>
                <button type="button" onClick={() => setMobileNav(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <WorkspaceSidebar
                workspace={workspace}
                activeId={activeId}
                onNavigate={() => setMobileNav(false)}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 overflow-hidden">
          <main className={cn("min-w-0 flex-1 overflow-y-auto", MOBILE_PRIMARY_BOTTOM_NAV_PAD)}>
            <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 px-4 py-2 backdrop-blur lg:hidden">
              <button
                type="button"
                onClick={() => setMobileNav(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-border)]"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                {def.label}
              </span>
              <Link
                href="/"
                className="ml-auto text-xs font-medium text-[var(--color-accent)]"
              >
                Mission Control
              </Link>
            </div>
            {children}
          </main>

          {rightPanelEnabled && (
            <aside className="hidden w-[280px] shrink-0 overflow-y-auto border-l border-[var(--color-border)] bg-[var(--color-surface)] xl:block">
              <WorkspaceRightPanel workspace={workspace} />
            </aside>
          )}
        </div>
      </div>

      <MobilePrimaryBottomNav isAuthenticated={Boolean(user)} />
    </div>
  );
}
