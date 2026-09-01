"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductHubGroup } from "@/lib/community/commerce/unified";

export function ProductHub({
  groups,
  className,
}: {
  groups: ProductHubGroup[];
  className?: string;
}) {
  const [active, setActive] = useState(groups[0]?.id ?? "digital");
  const current = groups.find((g) => g.id === active) ?? groups[0];

  if (groups.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Product hub"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
            Product hub
          </h3>
          <p className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            Digital, physical, courses, memberships, bundles, and offers — one desk.
          </p>
        </div>
        <Link
          href="/marketplace/new"
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New product
        </Link>
      </div>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition",
              active === g.id
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            )}
          >
            {g.label}
            <span className="ml-1 opacity-70">({g.count})</span>
          </button>
        ))}
      </div>

      {current && (
        <div className="mt-3 space-y-2">
          {current.items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border)] px-3 py-4 text-[13px] text-[var(--color-text-muted)]">
              Nothing in {current.label.toLowerCase()} yet.{" "}
              <Link
                href={current.href}
                className="font-semibold text-[var(--color-accent)] hover:underline"
              >
                Add one
              </Link>
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {current.items.map((item) => (
                <li key={`${current.id}-${item.id}`}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 transition hover:border-[var(--color-accent)]/35"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold text-[var(--color-text-primary)]">
                        {item.title}
                      </span>
                      <span className="text-[11px] text-[var(--color-text-muted)]">
                        {item.meta}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
