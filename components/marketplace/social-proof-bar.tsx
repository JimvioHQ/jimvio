"use client";

import React from "react";
import {  ShieldCheck, TrendingUp, Package, Globe  } from "lucide-react"
import { VscPackage } from "react-icons/vsc";
import { cn } from "@/lib/utils";
import {
  formatPlatformStat,
  PLATFORM_STATS,
} from "@/lib/platform-stats";
import {
  AnimatedPlatformStatValue,
} from "@/components/platform/platform-stats-provider";

export type SocialProofBarProps = {
  verifiedVendors?: number | string;
  successRate?: number | string;
  totalProducts?: number | string;
  countries?: number | string;
  className?: string;
};

const defaultStats = {
  verifiedVendors: formatPlatformStat("businesses", PLATFORM_STATS.businesses),
  successRate: "99.2%",
  totalProducts: formatPlatformStat("products", PLATFORM_STATS.products),
  countries: String(PLATFORM_STATS.countries),
};

export function SocialProofBar({
  verifiedVendors = defaultStats.verifiedVendors,
  successRate = defaultStats.successRate,
  totalProducts = defaultStats.totalProducts,
  countries = defaultStats.countries,
  className,
}: SocialProofBarProps) {
  const items = [
    { icon: ShieldCheck, value: verifiedVendors, label: "Verified Vendors", statKey: "businesses" as const, animated: true },
    { icon: TrendingUp, value: successRate, label: "Successful Trades", animated: false },
    { icon: Package, value: totalProducts, label: "Products", statKey: "products" as const, animated: true },
    { icon: Globe, value: countries, label: "Countries trading", statKey: "countries" as const, animated: true },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
        className
      )}
    >
      {items.map(({ icon: Icon, value, label, statKey, animated }, i) => (
        <div
          key={i}
          className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111] border border-stone-100 dark:border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(253,80,0,0.1)] hover:border-[var(--color-accent)]/20 hover:-translate-y-1 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/30 group-hover:bg-[var(--color-accent)] group-hover:border-[var(--color-accent)] transition-all duration-300">
            <Icon className="h-5 w-5 text-[var(--color-accent)] group-hover:text-white transition-colors duration-300" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] sm:text-[18px] font-bold text-[#11181c] dark:text-[#ededed] tracking-tight tabular-nums">
              {animated && statKey ? (
                <AnimatedPlatformStatValue statKey={statKey} />
              ) : (
                value
              )}
            </p>
            <p className="text-[10px] sm:text-[11px] text-[#889096] dark:text-[#6a6a6a] font-medium mt-0.5 truncate">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
