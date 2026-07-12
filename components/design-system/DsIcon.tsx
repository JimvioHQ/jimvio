"use client";

import type { LucideIcon } from "lucide-react";
import { dsIconSize, type DsIconSize } from "@/lib/design-system";
import { cn } from "@/lib/utils";

export function DsIcon({
  icon: Icon,
  size = "md",
  className,
  label,
}: {
  icon: LucideIcon;
  size?: DsIconSize;
  className?: string;
  label?: string;
}) {
  const px = dsIconSize[size];
  return (
    <Icon
      className={cn("shrink-0", className)}
      size={px}
      strokeWidth={2}
      aria-hidden={!label}
      aria-label={label}
    />
  );
}
