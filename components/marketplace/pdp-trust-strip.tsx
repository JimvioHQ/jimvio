"use client";

import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

/**
 * Compact PDP trust strip — only Jimvio-backed claims (protection page / checkout security).
 * Avoids invented metrics like "100% safe" or dollar-protection amounts.
 */
const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Buyer Protection",
    href: "/protection",
  },
  {
    icon: Lock,
    title: "Secure Payments",
    href: null as string | null,
  },
  {
    icon: Lock,
    title: "SSL Encrypted",
    href: null as string | null,
  },
] as const;

export function PdpTrustStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/60",
        className,
      )}
      role="list"
      aria-label="Jimvio trust protections"
    >
      <div className="flex snap-x snap-mandatory gap-0 overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          const content = (
            <>
              <Icon
                className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]"
                aria-hidden
              />
              <span className="truncate text-[11px] font-semibold text-[var(--color-text-primary)] sm:text-[12px]">
                {item.title}
              </span>
            </>
          );
          const cellClass = cn(
            "flex min-w-[42%] snap-start items-center gap-2 px-3 py-2.5 sm:min-w-0 sm:flex-1",
            i > 0 && "border-l border-[var(--color-border)]",
          );
          if (item.href) {
            return (
              <Link
                key={item.title}
                href={item.href}
                role="listitem"
                className={cn(cellClass, "transition-opacity hover:opacity-80")}
              >
                {content}
              </Link>
            );
          }
          return (
            <div key={item.title} role="listitem" className={cellClass}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
