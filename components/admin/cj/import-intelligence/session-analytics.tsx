"use client";

import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

export function SessionAnalytics({
  todaysImports,
  publishedProducts,
  draftProducts,
  averageMargin,
  averageShippingDays,
  averageProfit,
  className,
}: {
  todaysImports: number;
  publishedProducts: number;
  draftProducts: number;
  averageMargin: number;
  averageShippingDays: number;
  averageProfit: number;
  className?: string;
}) {
  const stats = [
    { label: "Today's Imports", value: todaysImports, suffix: "" },
    { label: "Published", value: publishedProducts, suffix: "", accent: true },
    { label: "Drafts", value: draftProducts, suffix: "" },
    { label: "Avg Margin", value: averageMargin, suffix: "%" },
    { label: "Avg Ship", value: averageShippingDays, suffix: "d", decimals: 1 },
    { label: "Avg Profit", value: averageProfit, suffix: "", prefix: "$", decimals: 2 },
  ];

  return (
    <div
      className={cn(
        "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2",
        className
      )}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(
            "rounded-sm border px-3 py-2 backdrop-blur-sm transition-all",
            s.accent
              ? "border-[#FF5A1F]/30 bg-[#FF5A1F]/10"
              : "border-white/15 bg-white/5"
          )}
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-white/55 truncate">
            {s.label}
          </p>
          <p className="text-[17px] font-bold text-white mt-0.5">
            <AnimatedCounter
              value={s.value}
              decimals={s.decimals ?? 0}
              prefix={s.prefix}
              suffix={s.suffix}
            />
          </p>
        </div>
      ))}
    </div>
  );
}
