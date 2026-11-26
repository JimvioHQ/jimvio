"use client";

import {
  BadgeDollarSign,
  BookOpen,
  CircleCheck,
  Download,
  KeyRound,
  ShieldCheck,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  MARKETPLACE_BENEFITS,
  type MarketplaceBenefitIcon,
  type MarketplaceProductType,
} from "@/lib/marketplace/experience";

const ICONS: Record<MarketplaceBenefitIcon, LucideIcon> = {
  shield: ShieldCheck,
  badge: BadgeDollarSign,
  check: CircleCheck,
  truck: Truck,
  download: Download,
  key: KeyRound,
  user: UserRound,
  book: BookOpen,
};

type Stats = {
  viewers_now: number;
  revenue_today: number;
};

function BadgeIcon({ icon }: { icon: MarketplaceBenefitIcon }) {
  const Icon = ICONS[icon];
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-accent-light)] text-[var(--color-accent)] sm:size-9 lg:size-10 lg:rounded-xl">
      <Icon className="size-3.5 sm:size-4 lg:size-5" strokeWidth={2.25} aria-hidden />
    </span>
  );
}

export function MarketplaceTrustStrip({
  productType = "physical",
}: {
  productType?: MarketplaceProductType;
  stats: Stats;
  listingCount: number;
}) {
  const badges = MARKETPLACE_BENEFITS[productType];

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden" data-marketplace-benefits={productType}>
      <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:hidden">
        {badges.map((badge) => (
          <div
            key={badge.title}
            className="flex min-w-0 flex-col items-center rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1 py-2 text-center sm:flex-row sm:items-center sm:gap-2 sm:px-2.5 sm:py-2.5 sm:text-left"
          >
            <BadgeIcon icon={badge.icon} />
            <div className="mt-1 min-w-0 w-full overflow-hidden sm:mt-0 sm:flex-1">
              <p className="truncate text-[7px] font-bold text-[var(--color-text-primary)] sm:text-[10px]">
                {badge.title}
              </p>
              <p className="mt-0.5 hidden text-[9px] text-[var(--color-text-muted)] sm:line-clamp-2 sm:block">
                {badge.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden w-full items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:flex xl:px-5">
        {badges.map((badge) => (
          <div key={badge.title} className="flex min-w-0 flex-1 items-center gap-2.5">
            <BadgeIcon icon={badge.icon} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-[var(--color-text-primary)]">
                {badge.title}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">{badge.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
