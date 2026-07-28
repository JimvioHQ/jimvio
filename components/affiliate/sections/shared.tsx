import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const AFFILIATE_SHELL =
  "mx-auto w-full max-w-[1120px] px-4 sm:px-5 lg:px-6";

export const AFFILIATE_CARD =
  "rounded-[14px] border border-[#EAECEF] bg-white shadow-[0_1px_3px_rgba(17,24,39,0.04),0_1px_2px_rgba(17,24,39,0.03)]";

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
