"use client";

import { X } from "lucide-react";
import { contextToModuleLabel } from "@/lib/jimvio-super-app";
import type { JimvioSuperAppData } from "@/lib/jimvio-super-app/types";
import { useSuperAppStore } from "@/lib/store/use-super-app-store";
import { SuperAppModules } from "./SuperAppModules";
import { SuperAppWalletPanel } from "./SuperAppWalletPanel";
import { SuperAppMessagesPanel } from "./SuperAppMessagesPanel";
import { SuperAppWorkspaceSwitcher } from "./SuperAppWorkspaceSwitcher";
import { SuperAppContextAi } from "./SuperAppContextAi";
import { SuperAppNotificationsPanel } from "./SuperAppNotificationsPanel";

const PANEL_TITLES = {
  modules: "Super App Modules",
  wallet: "Global Wallet",
  messages: "Messages",
  workspace: "Workspace",
  notifications: "Notifications",
  none: "",
} as const;

export function SuperAppPanel({ data }: { data: JimvioSuperAppData }) {
  const activePanel = useSuperAppStore((s) => s.activePanel);
  const context = useSuperAppStore((s) => s.context);
  const closePanel = useSuperAppStore((s) => s.closePanel);

  if (activePanel === "none") return null;

  return (
    <>
      <div className="fixed inset-0 z-[9994] bg-black/30 backdrop-blur-[1px]" aria-hidden onClick={closePanel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={PANEL_TITLES[activePanel]}
        className="fixed bottom-24 left-1/2 z-[9995] w-[min(100vw-2rem,420px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:bottom-28"
        style={{ animation: "jimvio-super-app-enter 260ms ease-out", maxHeight: "min(70vh, 560px)" }}
      >
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
              {contextToModuleLabel(context)}
            </p>
            <h2 className="text-sm font-bold text-[var(--color-text-primary)]">{PANEL_TITLES[activePanel]}</h2>
          </div>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close panel"
            className="grid size-8 place-items-center rounded-lg border border-[var(--color-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(min(70vh, 560px) - 56px)" }}>
          <div className="mb-4">
            <SuperAppContextAi />
          </div>

          {activePanel === "modules" && <SuperAppModules />}
          {activePanel === "wallet" && <SuperAppWalletPanel data={data} />}
          {activePanel === "messages" && <SuperAppMessagesPanel data={data} />}
          {activePanel === "workspace" && <SuperAppWorkspaceSwitcher />}
          {activePanel === "notifications" && <SuperAppNotificationsPanel />}
        </div>
      </div>
    </>
  );
}
