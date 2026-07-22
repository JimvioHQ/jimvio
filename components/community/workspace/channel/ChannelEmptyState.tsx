"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ChannelEmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="text-[15px] font-bold text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
        {description}
      </p>
    </div>
  );
}
