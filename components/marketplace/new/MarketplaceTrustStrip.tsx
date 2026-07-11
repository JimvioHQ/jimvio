"use client";

import { ShieldCheck, Truck, Lock } from "lucide-react";

const BADGES = [
  {
    title: "Secure Payments",
    sub: "100% safe",
    iconBg: "bg-red-500/10 dark:bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    icon: "lock" as const,
  },
  {
    title: "Buyer Protection",
    sub: "Money-back guarantee",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    iconColor: "text-[var(--color-accent)]",
    icon: "shield" as const,
  },
  {
    title: "Verified Suppliers",
    sub: "Trusted & reliable",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    icon: "shield" as const,
  },
  {
    title: "Fast Delivery",
    sub: "Worldwide shipping",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    icon: "truck" as const,
  },
] as const;

type Stats = {
  viewers_now: number;
  revenue_today: number;
  creators_active: number;
};

function BadgeIcon({
  icon,
  iconBg,
  iconColor,
}: {
  icon: "lock" | "shield" | "truck";
  iconBg: string;
  iconColor: string;
}) {
  const Icon = icon === "lock" ? Lock : icon === "truck" ? Truck : ShieldCheck;
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-lg sm:size-9 lg:size-10 lg:rounded-xl ${iconBg} ${iconColor}`}
    >
      <Icon className="size-3.5 sm:size-4 lg:size-5" strokeWidth={2.25} />
    </span>
  );
}

export function MarketplaceTrustStrip({
  stats: _stats,
  listingCount: _listingCount,
}: {
  stats: Stats;
  listingCount: number;
}) {
  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Mobile / tablet ── */}
      <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:hidden">
        {BADGES.map((b) => (
          <div
            key={b.title}
            className="flex min-w-0 flex- rounded-sm items-center border border-[var(--color-border)]
             bg-[var(--color-surface)] px-1 py-2 text-center sm:flex-row sm:items-center
             sm:gap-2 sm:px-2.5 sm:py-2.5 sm:text-left"
          >
            <BadgeIcon icon={b.icon} iconBg={b.iconBg} iconColor={b.iconColor} />
            <div className="mt-1 min-w-0 w-full overflow-hidden sm:mt-0 sm:flex-1">
              <p className="truncate text-[7px] font-bold text-[var(--color-text-primary)] sm:text-[10px]">
                {b.title}
              </p>
              <p className="mt-0.5 hidden text-[9px] text-[var(--color-text-muted)] sm:line-clamp-2 sm:block">
                {b.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop ── */}
      <div className="hidden w-full items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:flex xl:px-5">
        {BADGES.map((b) => (
          <div key={b.title} className="flex min-w-0 flex-1 items-center gap-2.5">
            <BadgeIcon icon={b.icon} iconBg={b.iconBg} iconColor={b.iconColor} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-[var(--color-text-primary)]">
                {b.title}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
