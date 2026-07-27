"use client";

import { memo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bookmark,
  ClipboardList,
  Flag,
  LayoutGrid,
  MessageSquare,
  Radio,
  Scissors,
  Settings,
  Share2,
  Smile,
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
  onClip,
  onSave,
  onReport,
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
  onClip: () => void;
  onSave: () => void;
  onReport: () => void;
}) {
  const liveNow: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutGrid,
      active: leftPanel === "none",
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
      active: rightTab === "chat" && leftPanel !== "none",
      onClick: () => onOpenRight("chat"),
    },
    {
      id: "qa",
      label: "Q&A",
      icon: MessageSquare,
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
      id: "reactions",
      label: "Reactions",
      icon: Smile,
      onClick: () => onOpenRight("chat"),
    },
    {
      id: "clips",
      label: "Clips",
      icon: Scissors,
      active: rightTab === "clips",
      onClick: () => onOpenRight("clips"),
    },
    {
      id: "rooms",
      label: "Rooms",
      icon: Radio,
      active: leftPanel === "rooms",
      onClick: () => onOpenLeft("rooms"),
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: BarChart3,
      active: rightTab === "analytics",
      onClick: () => onOpenRight("analytics"),
    },
  ];

  const quick: NavItem[] = [
    { id: "share", label: "Share Live", icon: Share2, onClick: onShare },
    { id: "invite", label: "Invite People", icon: UsersRound, onClick: onInvite },
    { id: "clip", label: "Clip Moment", icon: Scissors, onClick: onClip },
    { id: "save", label: "Save Live", icon: Bookmark, onClick: onSave },
    { id: "report", label: "Report Live", icon: Flag, onClick: onReport },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      active: leftPanel === "settings",
      onClick: () => onOpenLeft("settings"),
    },
  ];

  return (
    <nav
      aria-label="Live session navigation"
      className="hidden h-full w-[200px] shrink-0 flex-col border-r border-neutral-200/70 bg-white xl:flex"
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <Section label="Live now">
          {liveNow.map((item) => (
            <NavRow key={item.id} item={item} />
          ))}
        </Section>
        <Section label="Quick actions" className="mt-5">
          {quick.map((item) => (
            <NavRow key={item.id} item={item} muted />
          ))}
        </Section>
      </div>
      <div className="border-t border-neutral-100 px-3 py-3">
        <div className="rounded-xl bg-gradient-to-br from-accent-light to-white p-3 ring-1 ring-accent/10">
          <p className="text-[11px] font-semibold tracking-[-0.01em] text-neutral-900">
            Creator Live tips
          </p>
          <ul className="mt-2 space-y-1 text-[10px] leading-relaxed text-neutral-500">
            <li className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-accent" aria-hidden />
              Keep mic clear and light soft for premium HD.
            </li>
          </ul>
        </div>
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
      <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
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
        "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px]",
        MOTION_COLORS,
        FOCUS_RING,
        item.active
          ? "bg-accent/10 font-semibold text-accent"
          : muted
            ? "font-medium text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
            : "font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
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
