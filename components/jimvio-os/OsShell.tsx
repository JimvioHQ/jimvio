"use client";

import { X, Bell, Activity as ActivityIcon, LayoutGrid } from "lucide-react";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { OsSidebar } from "./OsSidebar";
import { OsSearchBridge } from "./OsSearchBridge";
import { OsWorkspaceSwitcher } from "./OsWorkspaceSwitcher";
import { OsNotificationPanel } from "./OsNotificationPanel";
import { OsActivityFeed } from "./OsActivityFeed";
import { OsAiEntry } from "./OsAiEntry";
import { WorkspaceHome } from "./WorkspaceHome";
import { cn } from "@/lib/utils";

export function OsShell() {
  const isOpen = useJimvioOsStore((s) => s.isOpen);
  const closeOs = useJimvioOsStore((s) => s.closeOs);
  const activePanel = useJimvioOsStore((s) => s.activePanel);
  const setActivePanel = useJimvioOsStore((s) => s.setActivePanel);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[9990] bg-black/40 backdrop-blur-sm"
        aria-hidden
        onClick={closeOs}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jimvio Operating System"
        className="fixed inset-y-0 left-0 z-[9991] flex w-[min(100vw,960px)] max-w-[96vw] overflow-hidden border-r border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl sm:max-w-[min(96vw,960px)]"
        style={{ animation: "jimvio-os-enter 280ms ease-out" }}
      >
        <OsSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <div className="min-w-0 flex-1 space-y-3">
              <OsWorkspaceSwitcher />
              <OsSearchBridge />
            </div>
            <button
              type="button"
              onClick={closeOs}
              aria-label="Close Jimvio OS"
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] transition-[transform,background-color] hover:scale-[1.04] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ willChange: "transform" }}
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="flex items-center gap-1 border-b border-[var(--color-border)] px-4 py-2">
            {(
              [
                { id: "none" as const, label: "Overview", icon: LayoutGrid },
                { id: "notifications" as const, label: "Notifications", icon: Bell },
                { id: "activity" as const, label: "Activity", icon: ActivityIcon },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activePanel === tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-[transform,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
                  activePanel === tab.id
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]",
                )}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <main className="min-h-0 flex-1 overflow-y-auto p-4">
            {activePanel === "none" && (
              <div className="space-y-4">
                <WorkspaceHome />
                <OsAiEntry />
              </div>
            )}
            {activePanel === "notifications" && <OsNotificationPanel />}
            {activePanel === "activity" && <OsActivityFeed />}
          </main>
        </div>
      </div>
    </>
  );
}
