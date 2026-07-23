"use client";

import { OwnerConsoleSidebar } from "./OwnerConsoleSidebar";
import { OwnerConsoleTopBar } from "./OwnerConsoleTopBar";
import {
  OwnerConsoleProvider,
  type OwnerConsoleContextValue,
} from "./OwnerConsoleContext";

/**
 * Single reusable Owner Console layout — sidebar + top bar + workspace.
 * Context panel reserved for future phases.
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
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
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
          <OwnerConsoleSidebar
            communityId={value.community?.id ?? null}
            role={value.role}
            badges={value.badges}
          />
          <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-[1400px] gap-5 p-4 sm:p-5 lg:p-6">
              <div className="min-w-0 flex-1">{children}</div>
              {/* Context panel — reserved for Phase A.x */}
              <aside
                className="hidden w-[300px] shrink-0 xl:block"
                aria-label="Context panel"
              >
                <div className="sticky top-0 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                    Context
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                    Contextual details, inspectors, and secondary tools will
                    mount here without leaving the Owner Console.
                  </p>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </OwnerConsoleProvider>
  );
}
