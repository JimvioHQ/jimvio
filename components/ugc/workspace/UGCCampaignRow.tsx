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
          ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-3.5 lg:grid lg:grid-cols-6 lg:snap-none lg:overflow-visible"
          : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-3.5 lg:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UGCCampaignRowItem({
  children,
  featured = false,
}: {
  children: React.ReactNode;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "shrink-0 snap-start lg:w-auto lg:min-w-0",
        featured ? "w-[min(72vw,188px)]" : "w-[min(68vw,172px)]",
      )}
    >
      {children}
    </div>
  );
}
