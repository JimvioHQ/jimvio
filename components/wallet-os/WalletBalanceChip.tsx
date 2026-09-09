"use client";

import Link from "next/link";
import { Wallet } from "lucide-react";
import { formatMoneyAsUSD } from "@/lib/currency/platform";
import { cn } from "@/lib/utils";

type WalletBalanceChipProps = {
  amount: number | null | undefined;
  currency?: string;
  hydrated?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
  /** Compact horizontal: [Wallet icon] $0.00 — matches desktop Balance chrome */
  size?: "sm" | "md";
};

/**
 * Canonical compact wallet balance display for mobile menu / chrome.
 * Uses the same Wallet icon as desktop HeaderUtilityActions / ProfileAccountMenu.
 * Real USD amount only — never hardcode; never use the Jimvio brand logo.
 */
export function WalletBalanceChip({
  amount,
  currency = "USD",
  hydrated = true,
  href = "/wallet",
  onClick,
  className,
  size = "md",
}: WalletBalanceChipProps) {
  const safe =
    hydrated && typeof amount === "number" && Number.isFinite(amount) ? amount : null;
  const label = safe === null ? "—" : formatMoneyAsUSD(safe, currency);
  const iconSize = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  const inner = (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2",
        size === "sm" ? "gap-1.5" : "gap-2",
        className,
      )}
    >
      <Wallet
        className={cn("shrink-0 text-[#fd5000]", iconSize)}
        strokeWidth={1.75}
        aria-hidden
      />
      <span
        className={cn(
          "truncate font-bold tabular-nums text-[var(--color-text-primary)]",
          size === "sm" ? "text-[13px]" : "text-[15px]",
        )}
      >
        {label}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-label={`Wallet balance ${safe === null ? "loading" : label}`}
        className={cn(
          "relative flex min-h-[52px] items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 transition-colors hover:border-[#fd5000]/30",
          className,
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <span aria-label={`Wallet balance ${safe === null ? "loading" : label}`}>{inner}</span>
  );
}
