"use client";

import type { CatalogBadge } from "@/lib/cj/import-intelligence/types";
import { cn } from "@/lib/utils";

const BADGE_STYLES: Record<string, string> = {
  video: "bg-[#111827]/85",
  trending: "bg-[#FF5A1F]/90",
  verified: "bg-emerald-600/90",
  elite: "bg-violet-600/90",
  premium: "bg-[#FF5A1F]/90",
  "fast-shipping": "bg-sky-600/90",
  "in-stock": "bg-emerald-700/90",
  "us-warehouse": "bg-blue-700/90",
  "eu-warehouse": "bg-indigo-700/90",
  "uk-warehouse": "bg-sky-700/90",
};

export function CatalogBadgesRow({
  badges,
  max = 4,
  className,
}: {
  badges: CatalogBadge[];
  max?: number;
  className?: string;
}) {
  if (badges.length === 0) return null;

  const visible = badges.slice(0, max);
  const overflow = badges.length - visible.length;

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {visible.map((badge) => (
        <span
          key={badge.id}
          title={badge.label}
          className={cn(
            "inline-flex items-center gap-0.5 rounded-[6px] px-1.5 py-0.5 text-[7.5px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm",
            BADGE_STYLES[badge.id] ?? "bg-[#111827]/80"
          )}
        >
          <span>{badge.emoji}</span>
          <span className="hidden xs:inline">{badge.label}</span>
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-[6px] bg-black/50 px-1.5 py-0.5 text-[7.5px] font-semibold text-white">
          +{overflow}
        </span>
      )}
    </div>
  );
}
