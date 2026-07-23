"use client";

import Link from "next/link";
import { Link2, MousePointerClick, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildAffiliateLink,
  formatCommercePrice,
  useCreatorCommerceStore,
  type CommerceEmbed,
} from "@/lib/community/commerce";
import { toast } from "sonner";

export function CommerceAffiliateCard({
  embed,
  compact,
}: {
  embed: CommerceEmbed;
  compact?: boolean;
}) {
  const code = embed.affiliateCode || "jimvio";
  const trackClick = useCreatorCommerceStore((s) => s.trackAffiliateClick);
  const stats = useCreatorCommerceStore((s) =>
    s.affiliateStats.find((a) => a.code === code && a.offerId === embed.id)
  );
  const href = buildAffiliateLink({
    baseHref: embed.href || `/marketplace/${embed.id}`,
    code,
    offerId: embed.id,
  });

  function copyLink() {
    trackClick(code, embed.id);
    const full =
      typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
    void navigator.clipboard.writeText(full).then(
      () => toast.success("Affiliate link copied"),
      () => toast.error("Could not copy")
    );
  }

  return (
    <article
      className={cn(
        "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3",
        compact ? "max-w-[280px]" : "max-w-sm"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
        Affiliate offer
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">
        {embed.title}
      </p>
      {embed.commissionRate != null && (
        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
          {embed.commissionRate}% commission
          {embed.price != null
            ? ` · ${formatCommercePrice(embed.price, embed.currency)}`
            : ""}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
        <Stat
          icon={MousePointerClick}
          label="Clicks"
          value={String(stats?.clicks ?? 0)}
        />
        <Stat
          icon={TrendingUp}
          label="Conv."
          value={String(stats?.conversions ?? 0)}
        />
        <Stat
          icon={Link2}
          label="Earn"
          value={formatCommercePrice(stats?.earnings ?? 0, embed.currency)}
        />
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-md bg-[var(--color-accent)] px-2.5 py-1.5 text-[11px] font-semibold text-white"
        >
          <Link2 className="h-3 w-3" />
          Copy link
        </button>
        <Link
          href={href}
          onClick={() => trackClick(code, embed.id)}
          className="inline-flex items-center rounded-md border border-[var(--color-border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)]"
        >
          Open
        </Link>
      </div>
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Link2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-[var(--color-surface-secondary)] px-1 py-1.5">
      <Icon className="mx-auto h-3 w-3 text-[var(--color-accent)]" />
      <p className="mt-0.5 text-[11px] font-bold text-[var(--color-text-primary)]">
        {value}
      </p>
      <p className="text-[9px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
