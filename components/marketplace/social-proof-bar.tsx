"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_STATS_LABEL, getDemoPlatformStats } from "@/lib/demo-platform-stats";
import { formatPlatformStat } from "@/lib/platform-stats";
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

const demoDefaults = getDemoPlatformStats();

const defaultStats = {
  verifiedVendors: formatPlatformStat("businesses", demoDefaults.businesses),
  successRate: "99.2%",
  totalProducts: formatPlatformStat("products", demoDefaults.products),
  countries: String(demoDefaults.countries),
};

export function SocialProofBar({
  verifiedVendors = defaultStats.verifiedVendors,
  successRate = defaultStats.successRate,
  totalProducts = defaultStats.totalProducts,
  countries = defaultStats.countries,
  className,
}: SocialProofBarProps) {
  const items = [
    { icon: null, value: verifiedVendors, label: "Businesses", statKey: "businesses" as const, animated: true },
    { icon: TrendingUp, value: successRate, label: "Successful Trades", animated: false },
    { icon: null, value: totalProducts, label: "Products", statKey: "products" as const, animated: true },
    { icon: null, value: countries, label: "Countries", statKey: "countries" as const, animated: true },
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
          className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111] border border-stone-100 dark:border-white/6 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(253,80,0,0.1)] hover:border-[#fd5000]/20 hover:-translate-y-1 transition-all duration-300"
        >
          {Icon ? (
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/30 group-hover:bg-[#fd5000] group-hover:border-[#fd5000] transition-all duration-300">
            <Icon className="h-5 w-5 text-[#fd5000] group-hover:text-white transition-colors duration-300" />
          </div>
          ) : null}
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
      <p className="col-span-2 text-[11px] font-medium text-[#889096] lg:col-span-4">{DEMO_STATS_LABEL}</p>
    </div>
  );
}
