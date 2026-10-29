"use client";

import { ownerInter } from "@/app/self-hosted-fonts";
import { OwnerConsoleSidebarConnected } from "./OwnerConsoleSidebar";
import { OwnerConsoleTopBar } from "./OwnerConsoleTopBar";
import { ManageBottomNav } from "./ManageBottomNav";
import {
  OwnerConsoleProvider,
  type OwnerConsoleContextValue,
} from "./OwnerConsoleContext";

/**
 * Community Manager / Owner Console shell — sidebar + workspace top bar.
 * Manage mode sits under AppTopNav (HubLayout); owner hub is full-height.
 */
export function OwnerConsoleLayout({
  value,
  children,
}: {
  value: OwnerConsoleContextValue;
  children: React.ReactNode;
}) {
  const isManage = value.consoleMode === "manage";

  return (
    <OwnerConsoleProvider value={value}>
      <div
        className={`${ownerInter.variable} flex ${
          isManage ? "h-full" : "h-[100dvh]"
        } flex-col overflow-hidden bg-[#F8FAFC] text-[#111827]`}
        style={{
          fontFamily:
            "var(--font-owner-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <OwnerConsoleSidebarConnected />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <OwnerConsoleTopBar
              communities={value.communities}
              community={value.community}
              role={value.role}
              userName={value.userName}
              userAvatar={value.userAvatar}
              workspaceHref={value.workspaceHref}
              notificationCount={
                value.badges.reports + value.badges.joins + value.badges.live
              }
              consoleMode={value.consoleMode}
              hrefSection={value.hrefSection}
            />
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              <div
                className={`mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6 ${
                  isManage ? "pb-28 lg:pb-6" : ""
                }`}
              >
                {children}
              </div>
            </main>
            {isManage ? <ManageBottomNav /> : null}
          </div>
        </div>
      </div>
    </OwnerConsoleProvider>
  );
}
