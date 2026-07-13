import React from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type StatusType = "online" | "offline" | "away";

interface AvatarProps {
  src: string;
  alt: string;
  size?: AvatarSize;
  status?: StatusType;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

const statusColors: Record<StatusType, string> = {
  online: "bg-emerald-500",
  offline: "bg-gray-400",
  away: "bg-amber-400",
};

const statusSizes: Record<AvatarSize, string> = {
  sm: "h-2.5 w-2.5 ring-1",
  md: "h-3 w-3 ring-2",
  lg: "h-3.5 w-3.5 ring-2",
  xl: "h-4 w-4 ring-2",
};

export function Avatar({ src, alt, size = "md", status, className }: AvatarProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "overflow-hidden rounded-full bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]",
          sizeClasses[size]
        )}
      >
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://api.dicebear.com/7.x/avataaars/svg?seed=fallback";
          }}
        />
      </div>
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 rounded-full ring-[var(--color-card)]",
            statusColors[status],
            statusSizes[size]
          )}
        />
      )}
    </div>
  );
}
