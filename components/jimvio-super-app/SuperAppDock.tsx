"use client";

import {
  Bell,
  Command,
  LayoutGrid,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Wallet,
  Layers,
} from "lucide-react";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useSuperAppStore } from "@/lib/store/use-super-app-store";
import type { JimvioSuperAppData } from "@/lib/jimvio-super-app/types";
import { cn } from "@/lib/utils";

type DockAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  badge?: number;
};

export function SuperAppDock({ data }: { data: JimvioSuperAppData }) {
  const togglePanel = useSuperAppStore((s) => s.togglePanel);
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const openAssistant = useAIStore((s) => s.openAssistant);
  const openOs = useJimvioOsStore((s) => s.openOs);

  const actions: DockAction[] = [
    { id: "search", label: "Search", icon: Search, onClick: () => openCommandCenter() },
    { id: "create", label: "Create", icon: Plus, onClick: () => openOs() },
    { id: "messages", label: "Message", icon: MessageSquare, onClick: () => togglePanel("messages"), badge: data.unreadMessages },
    { id: "ai", label: "Ask AI", icon: Sparkles, onClick: () => openAssistant() },
    { id: "workspace", label: "Workspace", icon: Layers, onClick: () => togglePanel("workspace") },
    { id: "notifications", label: "Alerts", icon: Bell, onClick: () => togglePanel("notifications"), badge: data.unreadNotifications },
    { id: "wallet", label: "Wallet", icon: Wallet, onClick: () => togglePanel("wallet") },
    { id: "modules", label: "Modules", icon: LayoutGrid, onClick: () => togglePanel("modules") },
  ];

  return (
    <nav
      aria-label="Jimvio Super App universal actions"
      className="fixed bottom-4 left-1/2 z-[9993] -translate-x-1/2 px-2"
    >
      <div
        className="flex items-center gap-0.5 overflow-x-auto rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/95 p-1 shadow-xl backdrop-blur-md sm:gap-1"
        style={{ boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={action.onClick}
            aria-label={action.label}
            className={cn(
              "relative flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition-[transform,background-color] duration-200 hover:scale-[1.05] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:px-3",
            )}
            style={{ willChange: "transform", minWidth: 52 }}
          >
            <action.icon className="size-4 text-[var(--color-accent)]" />
            <span className="hidden text-[9px] font-bold text-[var(--color-text-secondary)] sm:block">{action.label}</span>
            {action.badge != null && action.badge > 0 && (
              <span className="absolute right-1 top-1 grid min-w-[16px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[8px] font-bold text-white">
                {action.badge}
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => openCommandCenter()}
          className="ml-0.5 hidden items-center gap-1 rounded-xl border border-[var(--color-border)] px-2 py-1.5 text-[10px] font-semibold text-[var(--color-text-muted)] sm:flex"
          aria-label="Command palette shortcut"
        >
          <Command className="size-3" />K
        </button>
      </div>
    </nav>
  );
}
