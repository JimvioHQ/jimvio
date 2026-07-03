"use client";

import {
  BarChart3,
  Flame,
  Package,
  Rocket,
  TrendingUp,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./animated-counter";

export function SessionAnalytics({
  publishedProducts,
  catalogSize,
  highProfitCount,
  trendingCount,
  videoCount,
  averageRoi,
  averageMargin,
  className,
}: {
  publishedProducts: number;
  catalogSize: number;
  highProfitCount: number;
  trendingCount: number;
  videoCount: number;
  averageRoi: number;
  averageMargin: number;
  className?: string;
}) {
  const stats = [
    { label: "Published", value: publishedProducts, suffix: "", icon: Rocket, accent: true },
    { label: "Catalog", value: catalogSize, suffix: "", icon: Package },
    { label: "High Profit", value: highProfitCount, suffix: "", icon: TrendingUp },
    { label: "Trending", value: trendingCount, suffix: "", icon: Flame },
    { label: "Video", value: videoCount, suffix: "", icon: Video },
    { label: "Avg ROI", value: averageRoi, suffix: "%", icon: BarChart3 },
    { label: "Avg Margin", value: averageMargin, suffix: "%", icon: BarChart3 },
  ];

  return (
    <div className={cn("flex gap-1.5 overflow-x-auto scrollbar-none", className)}>
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className={cn(
              "flex h-[52px] min-w-[96px] shrink-0 items-center gap-2 rounded-[12px] border px-2.5",
              "bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04)]",
              s.accent
                ? "border-[#FF5A1F]/20 bg-gradient-to-r from-[#FF5A1F]/[0.05] to-white"
                : "border-[#E5E7EB]"
            )}
          >
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                s.accent ? "text-[#FF5A1F]" : "text-[#9CA3AF]"
              )}
              strokeWidth={2}
            />
            <div className="min-w-0">
              <p className="truncate text-[9px] font-medium text-[#9CA3AF]">{s.label}</p>
              <p className="text-[13px] font-bold tabular-nums leading-none text-[#111827]">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
