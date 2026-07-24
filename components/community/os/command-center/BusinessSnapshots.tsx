"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { BusinessSnapshot } from "@/lib/community/os/command-center";

export function BusinessSnapshots({
  snapshots,
  className,
}: {
  snapshots: BusinessSnapshot[];
  className?: string;
}) {
  if (snapshots.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)} aria-label="Business snapshots">
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        Business snapshots
      </h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {snapshots.map((s) => (
          <Link
            key={s.id}
            href={s.href}
            className={cn(
              "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3",
              "transition hover:-translate-y-0.5 hover:border-[var(--color-accent)]/30",
              "hover:shadow-[0_6px_20px_rgba(0,0,0,0.04)]"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
              {s.label}
            </p>
            <p className="mt-1 truncate text-[15px] font-black tracking-tight text-[var(--color-text-primary)]">
              {s.value}
            </p>
            <p className="mt-0.5 truncate text-[10.5px] text-[var(--color-text-muted)]">
              {s.meta}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
