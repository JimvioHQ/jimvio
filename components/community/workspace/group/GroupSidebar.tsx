"use client";

import {
  BookOpen,
  Calendar,
  Folder,
  LayoutGrid,
  MessageCircle,
  Radio,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GROUP_SIDEBAR,
  type GroupSidebarId,
  type GroupTabId,
} from "@/lib/community/os";

const ICONS: Record<GroupSidebarId, LucideIcon> = {
  overview: LayoutGrid,
  discussion: MessageCircle,
  knowledge: BookOpen,
  resources: Folder,
  events: Calendar,
  courses: BookOpen,
  members: Users,
  store: ShoppingBag,
  live: Radio,
  settings: Settings,
};

export function GroupSidebar({
  active,
  onChange,
  showSettings,
  className,
}: {
  active: GroupTabId | "settings";
  onChange: (id: GroupSidebarId) => void;
  showSettings?: boolean;
  className?: string;
}) {
  const items = GROUP_SIDEBAR.filter(
    (item) => item.id !== "settings" || showSettings
  );

  return (
    <nav
      aria-label="Group workspace"
      className={cn(
        "hidden w-[200px] shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-2 lg:flex",
        className
      )}
    >
      <p className="mb-2 px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        Workspace
      </p>
      {items.map((item) => {
        const Icon = ICONS[item.id];
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors duration-150",
              isActive
                ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
