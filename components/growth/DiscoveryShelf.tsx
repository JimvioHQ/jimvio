"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DiscoveryItem, DiscoveryShelves } from "@/services/growth/discovery";

const labels: Array<[keyof DiscoveryShelves, string]> = [
  ["creators", "Suggested creators"],
  ["communities", "Communities to explore"],
  ["products", "Popular products"],
  ["lives", "Live now & upcoming"],
];

export function DiscoveryShelf() {
  const [shelves, setShelves] = useState<DiscoveryShelves | null>(null);

  useEffect(() => {
    fetch("/api/growth/discovery")
      .then((response) => response.ok ? response.json() : null)
      .then(setShelves)
      .catch(() => undefined);
  }, []);

  if (!shelves || !labels.some(([key]) => shelves[key].length)) return null;
  return (
    <section className="mt-5 space-y-5" aria-label="Discover Jimvio">
      {labels.map(([key, label]) => {
        const items = shelves[key];
        if (!items.length) return null;
        return <Shelf key={key} title={label} items={items} />;
      })}
    </section>
  );
}

function Shelf({ title, items }: { title: string; items: DiscoveryItem[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      <div className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 lg:grid-cols-6 sm:overflow-visible">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="min-w-[10.5rem] snap-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 transition-colors hover:border-[#fd5000] sm:min-w-0"
          >
            <div className="mb-2 flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-[var(--color-surface-secondary)] text-xs font-bold text-[var(--color-text-muted)]">
              {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : item.title.slice(0, 1)}
            </div>
            <p className="truncate text-xs font-semibold text-[var(--color-text-primary)]">{item.title}</p>
            {item.subtitle && <p className="mt-0.5 line-clamp-2 text-[11px] text-[var(--color-text-muted)]">{item.subtitle}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
