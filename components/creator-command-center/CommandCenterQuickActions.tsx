"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import {
  BarChart3,
  GraduationCap,
  Megaphone,
  Package,
  Sparkles,
  Store,
  Upload,
  UserPlus,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import type { CommandCenterQuickAction } from "@/lib/creator-command-center/types";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  store: Store,
  upload: Upload,
  users: Users,
  graduation: GraduationCap,
  video: Video,
  megaphone: Megaphone,
  wallet: Wallet,
  "user-plus": UserPlus,
  chart: BarChart3,
  sparkles: Sparkles,
  package: Package,
};

export function CommandCenterQuickActions({ actions }: { actions: CommandCenterQuickAction[] }) {
  const openAssistant = useAIStore((s) => s.openAssistant);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((action) => {
        const Icon = ICONS[action.icon] ?? Sparkles;
        const content = (
          <>
            <span
              className="grid size-9 place-items-center rounded-xl"
              style={{ background: `${action.accent}14`, color: action.accent }}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[12px] font-bold text-[var(--color-text-primary)]">
                {action.label}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-[var(--color-text-muted)]">
                {action.description}
              </span>
            </span>
          </>
        );

        const className =
          "flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left transition-[transform,border-color] duration-200 hover:scale-[1.02] hover:border-[var(--color-accent)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40";

        if (action.actionId === "open-ai") {
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => openAssistant()}
              className={className}
              style={{ willChange: "transform" }}
            >
              {content}
            </button>
          );
        }

        return (
          <Link key={action.id} href={action.href ?? "/dashboard"} className={className} style={{ willChange: "transform" }}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
