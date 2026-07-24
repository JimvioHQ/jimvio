"use client";

import Link from "next/link";
import { ShoppingBag, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LivePinnedOffer } from "@/lib/community/live-network";

export function LiveCommerceNetworkPanel({
  offers,
  onTogglePin,
  className,
}: {
  offers: LivePinnedOffer[];
  onTogglePin: (id: string) => void;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live commerce"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <ShoppingBag className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Live commerce
      </h3>
      <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
        Pin products, flash sales, coupons, affiliates — checkout without leaving stream.
      </p>
      <ul className="mt-3 space-y-2">
        {offers.map((o) => (
          <li
            key={o.id}
            className={cn(
              "rounded-xl border px-3 py-2.5",
              o.pinned
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)]/50"
                : "border-[var(--color-border)]"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-primary)]">
                  {o.kind === "flash" && (
                    <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                  )}
                  <span className="truncate">{o.title}</span>
                </p>
                <p className="text-[11px] text-[var(--color-text-muted)]">
                  {o.priceLabel}
                  {o.inventory != null ? ` · ${o.inventory} left` : ""}
                  {` · ${o.kind}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => onTogglePin(o.id)}
                  className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[10px] font-semibold"
                >
                  {o.pinned ? "Unpin" : "Pin"}
                </button>
                <Link
                  href={o.href}
                  className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[10px] font-semibold text-white"
                >
                  Buy now
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
