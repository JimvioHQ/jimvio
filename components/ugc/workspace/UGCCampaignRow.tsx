"use client";

import { cn } from "@/lib/utils";

/** Campaign strip — 6 cols desktop, horizontal scroll mobile/tablet */
export function UGCCampaignRow({
  children,
  className,
  scrollable = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** When false, use static grid (e.g. skeletons) */
  scrollable?: boolean;
}) {
  return (
    <div
      className={cn(
        scrollable
          ? "flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3 lg:grid lg:grid-cols-6 lg:snap-none lg:overflow-visible"
          : "grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:gap-3 lg:grid-cols-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function UGCCampaignRowItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[min(68vw,160px)] shrink-0 snap-start lg:w-auto lg:min-w-0">
      {children}
    </div>
  );
}
