"use client";

import { cn } from "@/lib/utils";

export function WorkspaceSkeleton({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("space-y-3 p-4", className)}
      aria-busy
      aria-label="Loading"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl bg-[var(--color-surface-secondary)]"
          style={{ height: i === 0 ? 72 : 48, animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

export function WorkspaceCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="h-28 animate-pulse rounded-xl bg-[var(--color-surface-secondary)]"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </ul>
  );
}
