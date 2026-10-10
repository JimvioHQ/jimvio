"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Package, ShoppingCart, Sparkles, Wallet } from "lucide-react";
import { useAIStore } from "@/lib/store/use-ai-store";
import {
  CART_HREF,
  MY_PRODUCTS_HREF,
  NOTIFICATIONS_HREF,
  WALLET_HREF,
  isMyProductsActive,
  isNotificationsActive,
  isWalletActive,
} from "@/lib/navigation/primary-nav";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import { cn } from "@/lib/utils";

type HeaderUtilityActionsProps = {
  isAuthenticated: boolean;
  cartCount?: number;
  notificationCount?: number;
  walletBalance?: number;
  walletCurrency?: string;
  /** Show seller products shortcut (authenticated only). */
  showProducts?: boolean;
  /** Replace the products shortcut with the existing Jimvio AI launcher. */
  showJimvioAi?: boolean;
  className?: string;
};

/**
 * Canonical post-search header utilities:
 * [Products?] → Notifications → Cart → Wallet + Balance
 * Orders and theme controls are intentionally absent.
 */
export function HeaderUtilityActions({
  isAuthenticated,
  cartCount = 0,
  notificationCount = 0,
  walletBalance = 0,
  walletCurrency = "USD",
  showProducts = true,
  showJimvioAi = false,
  className,
}: HeaderUtilityActionsProps) {
  const pathname = usePathname() ?? "/";
  const openAssistant = useAIStore((s) => s.openAssistant);
  const balanceLabel = formatMoneyAsUSD(walletBalance, walletCurrency);

  const iconBtn = cn(
    "relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-150 active:scale-[0.94]",
    "text-stone-500 hover:bg-black/[0.06] hover:text-stone-800",
  );

  return (
    <div className={cn("flex items-center gap-0.5 sm:gap-1", className)}>
      {isAuthenticated && showJimvioAi ? (
        <button
          type="button"
          onClick={() => openAssistant()}
          aria-label="Jimvio AI"
          title="Jimvio AI"
          className={cn(
            "relative inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 transition-all duration-150 active:scale-[0.94]",
            "text-[#FF5A1F] hover:bg-[#FF5A1F]/10 hover:text-[#FF5A1F]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40",
          )}
        >
          <Sparkles className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
          <span className="text-[12px] font-semibold leading-none tracking-tight">AI</span>
        </button>
      ) : isAuthenticated && showProducts ? (
        <Link
          href={MY_PRODUCTS_HREF}
          aria-label="My Products"
          title="My Products"
          className={cn(
            iconBtn,
            isMyProductsActive(pathname) && "bg-[#fd5000]/10 text-[#fd5000]",
          )}
        >
          <Package className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </Link>
      ) : null}

      {isAuthenticated ? (
        <Link
          href={NOTIFICATIONS_HREF}
          aria-label={
            notificationCount > 0
              ? `Notifications (${notificationCount} unread)`
              : "Notifications"
          }
          className={cn(
            iconBtn,
            isNotificationsActive(pathname) && "bg-[#fd5000]/10 text-[#fd5000]",
          )}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
          {notificationCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 z-20 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          ) : null}
        </Link>
      ) : null}

      <Link href={CART_HREF} aria-label="Cart" className={iconBtn}>
        <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.75} />
        {cartCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 z-20 grid h-4 min-w-[16px] place-items-center rounded-full bg-[#fd5000] px-1 text-[9px] font-bold text-white ring-2 ring-white">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        ) : null}
      </Link>

      {isAuthenticated ? (
        <Link
          href={WALLET_HREF}
          aria-label={`Wallet balance ${balanceLabel}`}
          title="Wallet"
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2 transition-all duration-150 active:scale-[0.97]",
            "text-[#fd5000] hover:bg-[#fd5000]/10",
            isWalletActive(pathname) && "bg-[#fd5000]/10",
          )}
        >
          <Wallet className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="hidden min-w-[3.25rem] text-left text-[12px] font-semibold tabular-nums sm:inline">
            {balanceLabel}
          </span>
        </Link>
      ) : null}
    </div>
  );
}
