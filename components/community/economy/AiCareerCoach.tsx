"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareerCoachTip, DiscoveryItem } from "@/lib/community/economy";

export function AiCareerCoach({
  tips,
  className,
}: {
  tips: CareerCoachTip[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="AI career coach"
    >
      <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        AI career coach
      </h3>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {tips.map((t) => (
          <li key={t.id}>
            {t.href ? (
              <Link
                href={t.href}
                className="block h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 hover:border-[var(--color-accent)]/40"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {t.title}
                </p>
                <p className="mt-1 line-clamp-3 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {t.body}
                </p>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-[var(--color-border)] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  {t.title}
                </p>
                <p className="mt-1 text-[12.5px] font-medium text-[var(--color-text-primary)]">
                  {t.body}
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const BUCKET_LABELS: Record<string, string> = {
  creators: "Creators",
  campaigns: "Campaigns",
  products: "Products",
  communities: "Communities",
  courses: "Courses",
  events: "Events",
  live: "Live",
  affiliate: "Affiliate",
  trending: "Trending",
};

export function GlobalDiscovery({
  items,
  className,
}: {
  items: DiscoveryItem[];
  className?: string;
}) {
  const buckets = Array.from(new Set(items.map((i) => i.bucket)));

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Global discovery"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <Compass className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Global discovery
      </h3>
      <div className="mt-3 space-y-3">
        {buckets.map((bucket) => {
          const rows = items.filter((i) => i.bucket === bucket);
          return (
            <div key={bucket}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                {BUCKET_LABELS[bucket] ?? bucket}
              </p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {rows.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-2.5 py-2 hover:border-[var(--color-accent)]/35"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] font-semibold text-[var(--color-text-primary)]">
                          {item.title}
                        </span>
                        <span className="text-[10.5px] text-[var(--color-text-muted)]">
                          {item.meta}
                        </span>
                      </span>
                      {item.score != null && (
                        <span className="shrink-0 text-[11px] font-black text-[var(--color-accent)]">
                          {Math.round(item.score)}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
