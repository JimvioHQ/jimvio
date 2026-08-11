"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROFILE_ACCOUNT_ITEMS,
  PROFILE_QUICK_ACCESS_ITEMS,
} from "@/lib/navigation/primary-nav";
import { signOut } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export type ProfileMenuUser = {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type ProfileAccountMenuProps = {
  user: ProfileMenuUser;
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
  messageCount?: number;
  inboxCount?: number;
  /** Extra account links after the standard set (deduped by href). */
  extraAccountItems?: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
  onNavigate?: () => void;
};

function badgeFor(
  key: "messages" | "inbox" | undefined,
  messageCount: number,
  inboxCount: number,
): number {
  if (key === "messages") return messageCount;
  if (key === "inbox") return inboxCount;
  return 0;
}

/**
 * Shared profile / account dropdown — Wallet, Orders, Messages, Inbox + account actions.
 */
export function ProfileAccountMenu({
  user,
  trigger,
  align = "end",
  className,
  contentClassName,
  messageCount = 0,
  inboxCount = 0,
  extraAccountItems = [],
  onNavigate,
}: ProfileAccountMenuProps) {
  const accountHrefs = new Set(PROFILE_ACCOUNT_ITEMS.map((i) => i.href));
  const extras = extraAccountItems.filter((i) => !accountHrefs.has(i.href));

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild className={className}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className={cn(
          "w-60 p-1.5 mt-2 rounded-xl border border-[var(--color-border,#e5e5e5)] bg-[var(--color-surface,#fff)] shadow-lg outline-none",
          contentClassName,
        )}
      >
        <div className="mb-1.5 rounded-lg border border-[var(--color-border,#e5e5e5)] bg-stone-50 px-3 py-2 dark:bg-stone-900">
          <p className="truncate text-[13px] font-semibold leading-tight text-stone-900 dark:text-white">
            {user.name}
          </p>
          {user.email ? (
            <p className="truncate text-[10px] text-stone-400">{user.email}</p>
          ) : null}
        </div>

        <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          Quick access
        </p>
        {PROFILE_QUICK_ACCESS_ITEMS.map((item) => {
          const Icon = item.icon;
          const badge = badgeFor(item.badge, messageCount, inboxCount);
          return (
            <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent cursor-pointer">
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0 text-stone-400" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 ? (
                  <span className="rounded-full bg-[#FF5A1F] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1.5" />

        <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
          Account
        </p>
        {[...PROFILE_ACCOUNT_ITEMS, ...extras].map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.href} asChild className="p-0 focus:bg-transparent cursor-pointer">
              <Link
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900 dark:text-stone-300 dark:hover:bg-white/5 dark:hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0 text-stone-400" />
                {item.label}
              </Link>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            window.location.href = "/";
          }}
          className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-red-500 focus:bg-red-500/10"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
