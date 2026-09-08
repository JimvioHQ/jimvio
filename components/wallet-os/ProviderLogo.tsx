"use client";

import { useState } from "react";
import { Building2, Smartphone } from "lucide-react";
import {
  institutionFaviconUrl,
  type PayoutInstitution,
} from "@/lib/payments/payout-provider-catalog";
import { cn } from "@/lib/utils";

type ProviderLogoProps = {
  institution?: Pick<PayoutInstitution, "name" | "logoSrc" | "logoDomain" | "method" | "shortCode"> | null;
  /** Explicit first-party asset override (e.g. Binance) */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

/**
 * Real provider branding when assets exist; robust fallback to neutral icon.
 * Never leaves a broken image in the layout.
 */
export function ProviderLogo({
  institution,
  src,
  size = "md",
  className,
}: ProviderLogoProps) {
  const primary = src || institution?.logoSrc || null;
  const favicon = !primary ? institutionFaviconUrl(institution?.logoDomain) : null;
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFavicon, setFailedFavicon] = useState(false);

  const showPrimary = primary && !failedPrimary;
  const showFavicon = !showPrimary && favicon && !failedFavicon;
  const FallbackIcon =
    institution?.method === "mobile_money" ? Smartphone : Building2;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-lg border border-black/[0.06] bg-white",
        SIZE[size],
        className,
      )}
      aria-hidden
    >
      {showPrimary ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={primary}
          alt=""
          className="h-full w-full object-contain p-1"
          loading="lazy"
          decoding="async"
          onError={() => setFailedPrimary(true)}
        />
      ) : showFavicon ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={favicon}
          alt=""
          className="h-[70%] w-[70%] object-contain"
          loading="lazy"
          decoding="async"
          onError={() => setFailedFavicon(true)}
        />
      ) : (
        <FallbackIcon className="h-3.5 w-3.5 text-[#9B968D]" strokeWidth={1.75} />
      )}
    </span>
  );
}
