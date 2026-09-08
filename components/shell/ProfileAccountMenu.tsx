"use client";

import Link from "next/link";
import {
  ChevronRight,
  Info,
  LogOut,
  Star,
  Wallet,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PROFILE_SUPPORT_ITEMS,
  PROFILE_TOOL_ITEMS,
} from "@/lib/navigation/primary-nav";
import { signOut } from "@/lib/auth/actions";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import { cn } from "@/lib/utils";

export type ProfileMenuUser = {
  name: string;
  /** Intentionally unused in UI — kept for call-site compatibility. */
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
  /** @deprecated Inbox removed from profile menu — ignored. */
  inboxCount?: number;
  walletBalance?: number;
  /** Canonical reward points (`jip_identity.xp`). Display as pts — never USD. */
  rewardsBalance?: number;
  walletCurrency?: string;
  /** Extra account links after the standard set (deduped by href). */
  extraAccountItems?: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
  }>;
  onNavigate?: () => void;
};

/**
 * Shared premium profile / account dropdown.
 * Name-only identity · wallet + rewards summary · creator tools · help · logout.
 */
export function ProfileAccountMenu({
  user,
  trigger,
  align = "end",
  className,
  contentClassName,
  messageCount = 0,
  inboxCount: _inboxCount = 0,
  walletBalance = 0,
  rewardsBalance = 0,
  walletCurrency = "USD",
  extraAccountItems = [],
  onNavigate,
}: ProfileAccountMenuProps) {
  void _inboxCount;
  const toolHrefs = new Set(PROFILE_TOOL_ITEMS.map((i) => i.href));
  const extras = extraAccountItems.filter((i) => !toolHrefs.has(i.href));
  const initial = (user.name?.trim()?.[0] || "U").toUpperCase();
  const balanceLabel = formatMoneyAsUSD(walletBalance, walletCurrency);
  const rewardsPoints = Math.max(0, Math.trunc(Number(rewardsBalance) || 0));
  const rewardsLabel = `${rewardsPoints.toLocaleString()} pts`;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild className={className}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className={cn(
          "z-[80] w-[300px] overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-0 shadow-[0_16px_48px_rgba(15,23,42,0.12),0_4px_12px_rgba(15,23,42,0.06)]",
          contentClassName,
        )}
      >
        {/* Identity — name only, no email */}
        <DropdownMenuItem asChild className="p-0 focus:bg-transparent cursor-pointer">
          <Link
            href="/identity/settings"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3.5 py-3.5 transition-colors hover:bg-stone-50"
          >
            <Avatar className="h-11 w-11 shrink-0 border border-stone-200">
              <AvatarImage src={user.avatarUrl ?? undefined} className="object-cover" />
              <AvatarFallback className="bg-[#fd5000] text-[14px] font-bold text-white">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-tight text-stone-900">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-stone-400">
                View and manage your account
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300" />
          </Link>
        </DropdownMenuItem>

        {/* Financial summary — real wallet + rewards balances */}
        <div className="mx-3 mb-2 grid grid-cols-2 gap-2 rounded-xl bg-[#FFF4EE] px-3 py-2.5">
          <Link
            href="/wallet"
            onClick={onNavigate}
            className="min-w-0 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-80"
          >
            <div className="flex items-center gap-1.5 text-[#fd5000]">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-[13px] font-bold tabular-nums text-stone-900">
                {balanceLabel}
              </span>
            </div>
            <p className="mt-0.5 text-[10px] font-medium text-stone-500">Wallet Balance</p>
          </Link>
          <Link
            href="/wallet/rewards"
            onClick={onNavigate}
            className="min-w-0 rounded-lg px-1 py-0.5 transition-opacity hover:opacity-80"
          >
            <div className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5 shrink-0 fill-[#fd5000] text-[#fd5000]" />
              <span className="truncate text-[13px] font-bold tabular-nums text-stone-900">
                {rewardsLabel}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-0.5 text-[10px] font-medium text-stone-500">
              Rewards
              <Info className="h-2.5 w-2.5 text-stone-400" aria-hidden />
            </p>
          </Link>
        </div>

        <div className="px-1.5 pb-1">
          {[...PROFILE_TOOL_ITEMS, ...extras].map((item) => {
            const Icon = item.icon;
            const badge =
              "badge" in item && item.badge === "messages" ? messageCount : 0;
            return (
              <DropdownMenuItem
                key={item.href + item.label}
                asChild
                className="p-0 focus:bg-transparent cursor-pointer"
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-stone-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-50 text-stone-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-stone-800">
                        {item.label}
                      </span>
                      {badge > 0 ? (
                        <span className="rounded-full bg-[#fd5000] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      ) : null}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-stone-400">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="my-0 bg-stone-100" />

        <div className="px-1.5 py-1">
          {PROFILE_SUPPORT_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.href}
                asChild
                className="p-0 focus:bg-transparent cursor-pointer"
              >
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-stone-50"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-stone-50 text-stone-500">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-stone-800">
                      {item.label}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-stone-400">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-300" />
                </Link>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuItem
            onSelect={async () => {
              await signOut();
              window.location.href = "/";
            }}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold text-red-500 focus:bg-red-500/10"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500">
              <LogOut className="h-4 w-4" />
            </span>
            Logout
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
