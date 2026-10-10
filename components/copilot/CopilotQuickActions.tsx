"use client";

import {
  Flame,
  Info,
  MessageSquare,
  PenLine,
  Percent,
  Scale,
  Search,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { CopilotQuickAction } from "@/lib/ai/copilot/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  trending: TrendingUp,
  scale: Scale,
  sparkles: Sparkles,
  percent: Percent,
  video: Video,
  users: Users,
  pen: PenLine,
  info: Info,
  message: MessageSquare,
  flame: Flame,
  search: Search,
};

type CopilotQuickActionsProps = {
  actions: CopilotQuickAction[];
  onSelect: (action: CopilotQuickAction) => void;
  disabled?: boolean;
  variant?: "grid" | "chips";
};

export function CopilotQuickActions({
  actions,
  onSelect,
  disabled = false,
  variant = "grid",
}: CopilotQuickActionsProps) {
  if (!actions.length) return null;

  if (variant === "chips") {
    return (
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Suggested actions"
      >
        {actions.map((action) => {
          const Icon = ICONS[action.icon] ?? Sparkles;
          return (
            <button
              key={action.id}
              type="button"
              role="listitem"
              disabled={disabled}
              onClick={() => onSelect(action)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-secondary)] transition-[transform,border-color,color] duration-200 hover:scale-[1.02] hover:border-[#FF5A1F]/40 hover:text-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 disabled:opacity-50"
            >
              <Icon className="size-3.5 text-[#FF5A1F]" aria-hidden />
              {action.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      role="list"
      aria-label="Quick actions"
    >
      {actions.map((action) => {
        const Icon = ICONS[action.icon] ?? Sparkles;
        return (
          <button
            key={action.id}
            type="button"
            role="listitem"
            disabled={disabled}
            onClick={() => onSelect(action)}
            className={cn(
              "flex items-center gap-3 rounded-full border border-[#F3D2C4] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
              "transition-[transform,border-color,background-color] duration-200",
              "hover:border-[#FF5A1F]/50 hover:bg-[#FFF8F5]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
              "disabled:opacity-50",
            )}
            style={{ willChange: "transform" }}
          >
            <span
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#FF5A1F]/10"
              aria-hidden
            >
              <Icon className="size-4 text-[#FF5A1F]" />
            </span>
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-[#1F2937]">
              {action.label}
            </span>
            <ChevronRight className="size-4 shrink-0 text-[#C4C4C4]" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
