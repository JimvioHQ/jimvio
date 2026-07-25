"use client";

import {
  BookOpen,
  Folder,
  GraduationCap,
  Megaphone,
  MessageCircle,
  Settings,
  ShoppingBag,
  Target,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GROUP_CHANNEL_SECTION_IDS,
  GROUP_SIDEBAR,
  type GroupSidebarId,
  type GroupTabId,
} from "@/lib/community/os";

const ICONS: Record<GroupSidebarId, LucideIcon> = {
  discussion: MessageCircle,
  announcements: Megaphone,
  knowledge: BookOpen,
  resources: Folder,
  courses: GraduationCap,
  marketplace: ShoppingBag,
  campaigns: Target,
  settings: Settings,
};

function NavButton({
  id,
  label,
  active,
  onChange,
}: {
  id: GroupSidebarId;
  label: string;
  active: boolean;
  onChange: (id: GroupSidebarId) => void;
}) {
  const Icon = ICONS[id];
  return (
    <button
      type="button"
      onClick={() => onChange(id)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1",
        active
          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}

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
  const discussion = items.find((item) => item.id === "discussion");
  const channelItems = items.filter((item) =>
    (GROUP_CHANNEL_SECTION_IDS as string[]).includes(item.id)
  );
  const settings = items.find((item) => item.id === "settings");

  return (
    <nav
      aria-label="Group workspace"
      className={cn(
        "hidden w-[200px] shrink-0 flex-col gap-0.5 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-2 lg:flex",
        className
      )}
    >
      <p className="mb-2 px-2.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        Group
      </p>
      {discussion ? (
        <NavButton
          id={discussion.id}
          label={discussion.label}
          active={active === discussion.id}
          onChange={onChange}
        />
      ) : null}

      <p className="mb-1 mt-3 px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
        Channels
      </p>
      {channelItems.map((item) => (
        <NavButton
          key={item.id}
          id={item.id}
          label={item.label}
          active={active === item.id}
          onChange={onChange}
        />
      ))}

      {settings ? (
        <div className="mt-3 border-t border-[var(--color-border)] pt-2">
          <NavButton
            id={settings.id}
            label={settings.label}
            active={active === settings.id}
            onChange={onChange}
          />
        </div>
      ) : null}
    </nav>
  );
}
