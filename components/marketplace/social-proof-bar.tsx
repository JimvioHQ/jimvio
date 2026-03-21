"use client";

import React from "react";
import { ShieldCheck, TrendingUp, Package, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type SocialProofBarProps = {
  verifiedVendors?: number | string;
  successRate?: number | string;
  totalProducts?: number | string;
  countries?: number | string;
  className?: string;
};

const defaultStats = {
  verifiedVendors: "2.4k+",
  successRate: "99.2%",
  totalProducts: "180k+",
  countries: "80+",
};

export function SocialProofBar({
  verifiedVendors = defaultStats.verifiedVendors,
  successRate = defaultStats.successRate,
  totalProducts = defaultStats.totalProducts,
  countries = defaultStats.countries,
  className,
}: SocialProofBarProps) {
  const items = [
    { icon: ShieldCheck, value: verifiedVendors, label: "Verified Vendors" },
    { icon: TrendingUp, value: successRate, label: "Successful Trades" },
    { icon: Package, value: totalProducts, label: "Products" },
    { icon: Globe, value: countries, label: "Countries trading" },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4",
        className
      )}
    >
      {items.map(({ icon: Icon, value, label }, i) => (
        <div
          key={i}
          className="group flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-white to-[#faf8fc] border border-[#ebe8f2] shadow-[0_2px_20px_-8px_rgba(43,34,72,0.12)] ring-1 ring-[#433360]/[0.04] hover:shadow-[0_12px_40px_-16px_rgba(249,115,22,0.18)] hover:border-[#f97316]/20 hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5] flex items-center justify-center shrink-0 ring-1 ring-[#f97316]/10 group-hover:ring-[#f97316]/25 transition-all">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#f97316]" />
          </div>
          <div className="min-w-0">
            <p className="text-[15px] sm:text-[18px] font-black text-text-primary tracking-tight tabular-nums">
              {value}
            </p>
            <p className="text-[11px] sm:text-[12px] text-[#6b7280] font-bold capitalize tracking-wide truncate">
              {label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
