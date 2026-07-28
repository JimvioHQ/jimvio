import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const AFFILIATE_SHELL =
  "mx-auto w-full max-w-[1120px] px-4 sm:px-5 lg:px-6";

export const AFFILIATE_CARD =
  "rounded-[16px] border border-[#E8EAED] bg-white shadow-[0_1px_2px_rgba(17,24,39,0.04),0_4px_12px_rgba(17,24,39,0.03)]";

export const AFFILIATE_ORANGE = "#FF5A1F";

export const AFFILIATE_BTN_PRIMARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] bg-[#FF5A1F] font-bold text-white shadow-[0_8px_20px_rgba(255,90,31,0.28)] transition-all duration-200 ease-out hover:bg-[#E04E18] hover:shadow-[0_10px_24px_rgba(255,90,31,0.36)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/40 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:transition-colors";

export const AFFILIATE_BTN_SECONDARY =
  "inline-flex items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white/90 font-semibold text-[#111827] backdrop-blur-sm transition-all duration-200 ease-out hover:border-[#FF5A1F]/35 hover:bg-[#FFF8F5] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30 focus-visible:ring-offset-2 motion-reduce:hover:translate-y-0 motion-reduce:transition-colors";

export const AFFILIATE_LINK =
  "inline-flex items-center gap-1 font-semibold text-[#FF5A1F] transition-opacity duration-200 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/30 focus-visible:ring-offset-2 rounded-sm";

export type AffiliateSpotlightProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  rate: number;
  commission: string;
  avgEarning: number;
  engagement: number;
  currency: string;
  image: string;
  price: number;
  sellerName?: string | null;
  verified?: boolean;
};

export function formatAffiliateMoney(amount: number, currency = "RWF") {
  try {
    if (currency === "RWF") {
      return `RWF ${Math.round(amount).toLocaleString("en-US")}`;
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString("en-US")}`;
  }
}

export function AffiliateSectionHeading({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-2 sm:mb-7 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="text-[22px] font-bold tracking-tight text-[#111827] sm:text-[24px]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-[#6B7280]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};
