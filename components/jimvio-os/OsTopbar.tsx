"use client";

import Link from "next/link";
import {
  Bell,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ProfileImage } from "@/components/ui/profile-image";
import { OS_WORKSPACE_MODES } from "@/lib/jimvio-os/config";
import { useCommandCenterStore } from "@/lib/store/use-command-center-store";
import { useJimvioOsStore } from "@/lib/store/use-jimvio-os-store";
import { useAIStore } from "@/lib/store/use-ai-store";
import { getInitials } from "@/lib/utils";
import { cn, OsPill } from "./os-ui";

export type OsTopbarUser = {
  name: string;
  avatarUrl?: string | null;
  email?: string | null;
};

type OsTopbarProps = {
  user?: OsTopbarUser;
  unreadNotifications?: number;
  unreadMessages?: number;
  onMobileMenuOpen?: () => void;
};

function TopbarIconButton({
  href,
  onClick,
  label,
  badge,
  children,
}: {
  href?: string;
  onClick?: () => void;
  label: string;
  badge?: number;
  children: React.ReactNode;
}) {
  const classes =
    "relative grid size-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40";

  const badgeNode = badge && badge > 0 ? (
    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[var(--color-surface)]">
      {badge > 9 ? "9+" : badge}
    </span>
  ) : null;

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {children}
        {badgeNode}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes}>
      {children}
      {badgeNode}
    </button>
  );
}

/** Global, persistent Creator OS topbar — search, quick create, and account actions. */
export function OsTopbar({ user, unreadNotifications = 0, unreadMessages = 0, onMobileMenuOpen }: OsTopbarProps) {
  const workspaceMode = useJimvioOsStore((s) => s.workspaceMode);
  const openQuickCreate = useJimvioOsStore((s) => s.openQuickCreate);
  const openCommandCenter = useCommandCenterStore((s) => s.openCommandCenter);
  const openAssistant = useAIStore((s) => s.openAssistant);

  const currentMode = OS_WORKSPACE_MODES.find((m) => m.id === workspaceMode) ?? OS_WORKSPACE_MODES[1];

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)]/80 bg-[var(--color-surface)]/90 px-3 backdrop-blur-md sm:gap-3 sm:px-4">
      <button
        type="button"
        onClick={onMobileMenuOpen}
        aria-label="Open navigation"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] lg:hidden"
      >
        <Menu className="size-[18px]" />
      </button>

      <OsPill tone="accent" className="hidden shrink-0 sm:inline-flex">
        {currentMode.label} workspace
      </OsPill>

      <button
        type="button"
        onClick={() => openCommandCenter()}
        aria-label="Search Jimvio"
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/70 px-3 text-left transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:max-w-[360px]"
      >
        <Search className="size-3.5 shrink-0 text-[var(--color-text-muted)]" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--color-text-muted)]">
          Search products, orders, creators…
        </span>
        <kbd className="hidden shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={openQuickCreate}
          aria-label="Quick create"
          className="hidden h-9 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:inline-flex"
        >
          <Plus className="size-3.5" />
          Create
        </button>
        <button
          type="button"
          onClick={openQuickCreate}
          aria-label="Quick create"
          className="grid size-9 place-items-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40 sm:hidden"
        >
          <Plus className="size-[18px]" />
        </button>

        <TopbarIconButton onClick={() => openAssistant()} label="Jimvio AI">
          <Sparkles className="size-[17px]" />
        </TopbarIconButton>

        <TopbarIconButton href="/dashboard/notifications" label="Notifications" badge={unreadNotifications}>
          <Bell className="size-[17px]" />
        </TopbarIconButton>

        <TopbarIconButton href="/dashboard/messages" label="Messages" badge={unreadMessages}>
          <MessageSquare className="size-[17px]" />
        </TopbarIconButton>

        <TopbarIconButton href="/wallet" label="Wallet">
          <Wallet className="size-[17px]" />
        </TopbarIconButton>

        <Link
          href="/identity"
          aria-label="Profile"
          className={cn(
            "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-secondary)] transition-[border-color] hover:border-[var(--color-border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40",
          )}
        >
          {user?.avatarUrl ? (
            <ProfileImage src={user.avatarUrl} alt={user.name} className="h-full w-full" />
          ) : (
            <span className="text-[10px] font-bold text-[var(--color-accent)]">
              {getInitials(user?.name || "You")}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
