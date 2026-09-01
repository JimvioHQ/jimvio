"use client";

import { Inter } from "next/font/google";
import { OwnerConsoleSidebarConnected } from "./OwnerConsoleSidebar";
import { OwnerConsoleTopBar } from "./OwnerConsoleTopBar";
import {
  OwnerConsoleProvider,
  type OwnerConsoleContextValue,
} from "./OwnerConsoleContext";

const ownerInter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-owner-inter",
});

/**
 * Premium Owner Console layout — sidebar + top bar + workspace.
 * Context panel mounts from dashboard / section children when needed.
 */
export function OwnerConsoleLayout({
  value,
  children,
}: {
  value: OwnerConsoleContextValue;
  children: React.ReactNode;
}) {
  return (
    <OwnerConsoleProvider value={value}>
      <div
        className={`${ownerInter.variable} flex h-[100dvh] flex-col overflow-hidden bg-[#FAFAFB] text-[#111827]`}
        style={{ fontFamily: "var(--font-owner-inter), ui-sans-serif, system-ui, sans-serif" }}
      >
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
        />
        <div className="flex min-h-0 flex-1">
          <OwnerConsoleSidebarConnected />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </OwnerConsoleProvider>
  );
}
