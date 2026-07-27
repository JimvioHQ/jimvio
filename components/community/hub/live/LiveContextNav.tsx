"use client";

import { memo, useMemo } from "react";
import {
  BarChart3,
  ClipboardList,
  Flag,
  HelpCircle,
  LayoutGrid,
  MessageSquare,
  Share2,
  Users,
  UsersRound,
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
  viewerCount,
  qaCount,
  onOverview,
  onOpenLeft,
  onOpenRight,
  onShare,
  onInvite,
  onReport,
  variant = "desktop",
}: {
  leftPanel: LeftPanel;
  rightTab: RightTab;
  viewerCount: number;
  qaCount?: number;
  onOverview: () => void;
  onOpenLeft: (panel: Exclude<LeftPanel, "none">) => void;
  onOpenRight: (tab: RightTab) => void;
  onShare: () => void;
  onInvite: () => void;
  onReport: () => void;
  variant?: "desktop" | "drawer";
}) {
  const liveNow: NavItem[] = useMemo(
    () => [
      {
        id: "overview",
        label: "Overview",
        icon: LayoutGrid,
        active: leftPanel === "none" && rightTab === "chat",
        onClick: onOverview,
      },
      {
        id: "people",
        label: "Participants",
        icon: Users,
        badge: formatCount(viewerCount),
        active: leftPanel === "people",
        onClick: () => onOpenLeft("people"),
      },
      {
        id: "chat",
        label: "Chat",
        icon: MessageSquare,
        active: rightTab === "chat",
        onClick: () => onOpenRight("chat"),
      },
      {
        id: "qa",
        label: "Q&A",
        icon: HelpCircle,
        badge: qaCount && qaCount > 0 ? qaCount : undefined,
        active: rightTab === "qa",
        onClick: () => onOpenRight("qa"),
      },
      {
        id: "polls",
        label: "Polls",
        icon: ClipboardList,
        active: rightTab === "polls",
        onClick: () => onOpenRight("polls"),
      },
      {
        id: "analytics",
        label: "Analytics",
        icon: BarChart3,
        active: rightTab === "analytics",
        onClick: () => onOpenRight("analytics"),
      },
    ],
    [leftPanel, rightTab, viewerCount, qaCount, onOverview, onOpenLeft, onOpenRight]
  );

  const quick: NavItem[] = useMemo(
    () => [
      { id: "share", label: "Share Live", icon: Share2, onClick: onShare },
      { id: "invite", label: "Invite People", icon: UsersRound, onClick: onInvite },
      { id: "report", label: "Report Live", icon: Flag, onClick: onReport },
    ],
    [onShare, onInvite, onReport]
  );

  return (
    <nav
      aria-label="Live session navigation"
      className={cn(
        "h-full shrink-0 flex-col bg-white",
        variant === "drawer"
          ? "flex w-full border-0"
          : "hidden w-[220px] border-r border-neutral-100 lg:flex"
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scrollbar-hide">
        <Section label="Live now">
          {liveNow.map((item) => (
            <NavRow key={item.id} item={item} />
          ))}
        </Section>
        <Section label="Quick actions" className="mt-4">
          {quick.map((item) => (
            <NavRow key={item.id} item={item} muted />
          ))}
        </Section>
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

export const LiveContextNav = memo(LiveContextNavImpl);
