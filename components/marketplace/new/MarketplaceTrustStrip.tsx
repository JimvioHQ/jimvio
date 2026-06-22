"use client";

import { ShieldCheck, Truck, DollarSign, Users } from "lucide-react";
import { fmtCount, fmtPrice } from "@/lib/utils";

const BADGES = [
  {
    title: "Secure Payments",
    sub: "100% safe",
    iconBg: "bg-red-500/10 dark:bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
    truck: false,
  },
  {
    title: "Buyer Protection",
    sub: "Money-back guarantee",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/15",
    iconColor: "text-[var(--color-accent)]",
    truck: false,
  },
  {
    title: "Verified Suppliers",
    sub: "Trusted & reliable",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    truck: false,
  },
  {
    title: "Fast Delivery",
    sub: "Worldwide shipping",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
    truck: true,
  },
] as const;

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop",
];

type Stats = {
  viewers_now: number;
  revenue_today: number;
  creators_active: number;
};

function BadgeIcon({
  truck,
  iconBg,
  iconColor,
}: {
  truck: boolean;
  iconBg: string;
  iconColor: string;
}) {
  const Icon = truck ? Truck : ShieldCheck;
  return (
    <span
      className={`grid size-7 shrink-0 place-items-center rounded-lg sm:size-9 lg:size-10 lg:rounded-xl ${iconBg} ${iconColor}`}
    >
      <Icon className="size-3.5 sm:size-4 lg:size-5" strokeWidth={2.25} />
    </span>
  );
}

function VDivider({ className = "" }: { className?: string }) {
  return (
    <span
      className={`mx-2 hidden h-10 w-px shrink-0 bg-[var(--color-border)] lg:block ${className}`}
    />
  );
}

export function MarketplaceTrustStrip({
  stats,
  listingCount,
}: {
  stats: Stats;
  listingCount: number;
}) {
  const viewers = stats.viewers_now > 0 ? stats.viewers_now : Math.max(listingCount, 1);

  return (
    <div className="w-full max-w-full min-w-0 overflow-hidden">
      {/* ── Mobile / tablet: 2 rows ── */}
      <div className="space-y-2.5 lg:hidden">
        <div className="grid w-full grid-cols-4 gap-1.5 sm:gap-2">
          {BADGES.map((b) => (
            <div
              key={b.title}
              className="flex min-w-0 flex- rounded-sm items-center border border-[var(--color-border)]
               bg-[var(--color-surface)] px-1 py-2 text-center sm:flex-row sm:items-center
               sm:gap-2 sm:px-2.5 sm:py-2.5 sm:text-left"
            >
              <BadgeIcon truck={b.truck} iconBg={b.iconBg} iconColor={b.iconColor} />
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

        <div className="grid grid-cols-3 items-center overflow-hidden rounded-sm border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-2.5 sm:px-4 sm:py-3">
          <StatViewers viewers={viewers} showAvatars className="border-r border-[var(--color-border)] pr-1 sm:pr-3" />
          <StatRevenue amount={stats.revenue_today} className="border-r border-[var(--color-border)] px-0.5 sm:px-2" />
          <StatCreators count={stats.creators_active} className="pl-0.5 sm:pl-2" />
        </div>
      </div>

      {/* ── Desktop: single row ── */}
      <div className="hidden w-full items-center overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 lg:flex xl:px-5">
        {BADGES.map((b) => (
          <div key={b.title} className="flex min-w-0 flex-1 items-center gap-2.5">
            <BadgeIcon truck={b.truck} iconBg={b.iconBg} iconColor={b.iconColor} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold leading-tight text-[var(--color-text-primary)]">
                {b.title}
              </p>
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">{b.sub}</p>
            </div>
          </div>
        ))}

        <VDivider />

        <StatViewers viewers={viewers} showAvatars desktop className="flex-1" />

        <VDivider />

        <StatRevenue amount={stats.revenue_today} desktop className="flex-1" />

        <VDivider />

        <StatCreators count={stats.creators_active} desktop className="flex-1" />
      </div>
    </div>
  );
}

function StatViewers({
  viewers,
  showAvatars = false,
  desktop = false,
  className = "",
}: {
  viewers: number;
  showAvatars?: boolean;
  desktop?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${className}`}>
      {(showAvatars || desktop) && (
        <div className="flex shrink-0 -space-x-2">
          {AVATARS.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className="size-6 rounded-full border-2 border-[var(--color-surface)] object-cover lg:size-7"
              style={{ zIndex: 3 - i }}
            />
          ))}
        </div>
      )}
      <div className="min-w-0 overflow-hidden leading-[1.3]">
        <p
          className={`font-bold text-emerald-600 dark:text-emerald-400 ${desktop ? "text-[15px]" : "text-[10px] sm:text-[14px]"}`}
        >
          {fmtCount(viewers)}
        </p>
        <p
          className={`truncate font-medium text-[var(--color-text-primary)] ${desktop ? "text-[12px]" : "text-[6px] sm:text-[10px]"}`}
        >
          people viewing now
        </p>
      </div>
    </div>
  );
}

function StatRevenue({
  amount,
  desktop = false,
  className = "",
}: {
  amount: number;
  desktop?: boolean;
  className?: string;
}) {
  if (!amount || amount <= 0) return null;

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${desktop ? "" : "justify-center"} ${className}`}
    >
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-white sm:size-8 lg:size-9">
        <DollarSign className="size-2.5 sm:size-3.5 lg:size-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 overflow-hidden leading-[1.3]">
        <p
          className={`font-bold text-[var(--color-text-primary)] ${desktop ? "text-[15px]" : "truncate text-[9px] sm:text-[14px]"}`}
        >
          {fmtPrice(amount)}
        </p>
        <p className={`truncate text-[var(--color-text-muted)] ${desktop ? "text-[12px]" : "text-[6px] sm:text-[10px]"}`}>
          generated today
        </p>
      </div>
    </div>
  );
}

function StatCreators({
  count,
  desktop = false,
  className = "",
}: {
  count: number;
  desktop?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-1.5 sm:gap-2 ${desktop ? "" : "justify-end"} ${className}`}>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400 sm:size-8 lg:size-9">
        <Users className="size-2.5 sm:size-3.5 lg:size-4" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 overflow-hidden leading-[1.3]">
        <p
          className={`font-bold text-[var(--color-text-primary)] ${desktop ? "text-[15px]" : "text-[10px] sm:text-[14px]"}`}
        >
          {fmtCount(count)}
        </p>
        <p
          className={`truncate font-medium text-[var(--color-text-primary)] ${desktop ? "text-[12px]" : "text-[6px] sm:text-[10px]"}`}
        >
          creators promoting
        </p>
      </div>
    </div>
  );
}
