"use client";

import { cn } from "@/lib/utils";

export type BlueVerifiedBadgeSize = "xs" | "sm" | "md" | "lg";

const SIZE_PX: Record<BlueVerifiedBadgeSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
};

/**
 * Canonical Jimvio blue verification tick.
 * Render only when a trusted verification resolver returns verified=true.
 * Do not invent verification from heuristics on call sites.
 */
export function BlueVerifiedBadge({
  verified,
  className,
  size = "md",
  label = "Verified on Jimvio",
  title,
}: {
  verified: boolean;
  className?: string;
  size?: BlueVerifiedBadgeSize;
  /** Accessible name when verified */
  label?: string;
  title?: string;
}) {
  if (!verified) return null;
  const px = SIZE_PX[size] ?? 16;
  const tip = title ?? label;
  return (
    <svg
      viewBox="0 0 16 16"
      width={px}
      height={px}
      className={cn("inline-block shrink-0 align-middle", className)}
      aria-label={label}
      role="img"
    >
      <title>{tip}</title>
      <circle cx="8" cy="8" r="8" fill="#1D9BF0" />
      <path
        d="M4.7 8.2l2.1 2.1 4.5-4.5"
        fill="none"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
