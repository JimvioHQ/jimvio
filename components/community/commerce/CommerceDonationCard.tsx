"use client";

import { Heart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCommercePrice,
  type CommerceEmbed,
  type DonationMode,
} from "@/lib/community/commerce";
import { toast } from "sonner";

const MODE_LABEL: Record<DonationMode, string> = {
  tip: "Tip",
  one_time: "One-time Donation",
  monthly: "Monthly Membership",
  support: "Support Creator",
};

const PRESETS = [5, 10, 25, 50];

export function CommerceDonationCard({
  embed,
  compact,
  onDonate,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
  onDonate?: (amount: number, mode: DonationMode) => void;
}) {
  const mode = embed.donationMode ?? "support";

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
        <Heart className="h-3 w-3" />
        {MODE_LABEL[mode]}
      </p>
      <p className="mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
        {embed.title}
      </p>
      {embed.sellerName && (
        <p className="text-[11px] text-[var(--color-text-muted)]">
          {embed.sellerName}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onDonate?.(n, mode);
              toast.success(`Thanks — ${formatCommercePrice(n, embed.currency)}`);
            }}
            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--color-accent)]/40"
          >
            {formatCommercePrice(n, embed.currency ?? "USD")}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          const amount = embed.price ?? 10;
          onDonate?.(amount, mode);
          toast.success("Support sent — thank you");
        }}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[11px] font-semibold text-white"
      >
        <Sparkles className="h-3 w-3" />
        {MODE_LABEL[mode]}
      </button>
    </article>
  );
}
