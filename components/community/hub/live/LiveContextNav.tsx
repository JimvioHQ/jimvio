"use client";

import { memo, useMemo } from "react";
import {
  LayoutGrid,
  MessageSquare,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeftPanel, RightTab } from "./studio-types";
import { FOCUS_RING, MOTION_COLORS } from "./studio-ui";
import { formatCount } from "./studio-utils";

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string | number;
  active?: boolean;
  onClick: () => void;
};

function LiveContextNavImpl({
  leftPanel,
  rightTab,
  rightOpen,
  viewerCount,
  onOverview,
  onOpenLeft,
  onToggleChat,
  onShare,
  variant = "desktop",
}: {
  leftPanel: LeftPanel;
  rightTab: RightTab;
  rightOpen: boolean;
  viewerCount: number;
  qaCount?: number;
  onOverview: () => void;
  onOpenLeft: (panel: Exclude<LeftPanel, "none">) => void;
  onToggleChat: () => void;
  onShare: () => void;
  onInvite?: () => void;
  onReport?: () => void;
  variant?: "desktop" | "drawer";
}) {
  const liveNow: NavItem[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutGrid,
        active: leftPanel === "none" && !rightOpen,
        onClick: onOverview,
      },
      {
        id: "people",
        label: "People",
        icon: Users,
        badge: formatCount(viewerCount),
        active: leftPanel === "people",
        onClick: () => onOpenLeft("people"),
      },
      {
        id: "chat",
        label: rightOpen && rightTab === "chat" ? "Close chat" : "Open chat",
        icon: MessageSquare,
        active: rightOpen && rightTab === "chat",
        onClick: onToggleChat,
      },
    ],
    [leftPanel, rightTab, rightOpen, viewerCount, onOverview, onOpenLeft, onToggleChat]
  );

  const quick: NavItem[] = useMemo(
    () => [
      {
        id: "settings",
        label: "Settings",
        icon: Settings,
        active: leftPanel === "settings",
        onClick: () => onOpenLeft("settings"),
      },
      { id: "share", label: "Share live", icon: Share2, onClick: onShare },
    ],
    [leftPanel, onOpenLeft, onShare]
  );

  if (variant === "drawer") {
    return (
      <nav aria-label="Live session navigation" className="flex h-full w-full flex-col bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
          <Section label="Live">
            {liveNow.map((item) => (
              <NavRow key={item.id} item={item} />
            ))}
          </Section>
          <Section label="Actions" className="mt-4">
            {quick.map((item) => (
              <NavRow key={item.id} item={item} muted />
            ))}
          </Section>
        </div>
      </nav>
    );
  }

  return (
    <nav
      aria-label="Live session navigation"
      className="hidden h-full w-14 shrink-0 flex-col border-r border-neutral-100 bg-white lg:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto px-1.5 py-3 scrollbar-hide">
        {liveNow.map((item) => (
          <IconRailButton key={item.id} item={item} />
        ))}
        <div className="my-1.5 h-px w-8 bg-neutral-100" aria-hidden />
        {quick.map((item) => (
          <IconRailButton key={item.id} item={item} muted />
        ))}
      </div>
    </nav>
  );
}

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </p>
      <div className="space-y-px">{children}</div>
    </div>
  );
}

function NavRow({ item, muted }: { item: NavItem; muted?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-current={item.active ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-[10px] px-2.5 py-[7px] text-left text-[12.5px]",
        MOTION_COLORS,
        FOCUS_RING,
        item.active
          ? "bg-accent/10 font-semibold text-accent"
          : muted
            ? "font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
            : "font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge != null && item.badge !== "" && (
        <span
          className={cn(
            "tabular-nums text-[10px]",
            item.active ? "text-accent/80" : "text-neutral-400"
          )}
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

function IconRailButton({ item, muted }: { item: NavItem; muted?: boolean }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-current={item.active ? "page" : undefined}
      onClick={item.onClick}
      className={cn(
        "relative inline-flex h-10 w-10 items-center justify-center rounded-xl",
        MOTION_COLORS,
        FOCUS_RING,
        item.active
          ? "bg-accent/10 text-accent"
          : muted
            ? "text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
            : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
      {item.badge != null && item.badge !== "" && (
        <span className="absolute -right-0.5 -top-0.5 min-w-[16px] rounded-full bg-neutral-900 px-1 text-center text-[9px] font-semibold leading-4 text-white">
          {item.badge}
        </span>
      )}
    </button>
  );
}

export const LiveContextNav = memo(LiveContextNavImpl);
