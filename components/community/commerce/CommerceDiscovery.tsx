"use client";

import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Flame,
  Package,
  Sparkles,
  Users,
} from "lucide-react";

/** Lightweight discovery strip for hub / OS dashboard. */
export function CommerceDiscovery({
  base,
}: {
  base: string;
}) {
  const links = [
    { href: `${base}/courses`, label: "Newest courses", icon: BookOpen },
    { href: "/marketplace", label: "Top resources", icon: Package },
    { href: `${base}/live`, label: "Upcoming lives", icon: Calendar },
    { href: `${base}?section=spaces`, label: "Popular groups", icon: Users },
    { href: `${base}?section=knowledge`, label: "Trending knowledge", icon: Flame },
    { href: "/influencers/browse", label: "Featured creators", icon: Sparkles },
  ] as const;

  return (
    <section className="space-y-2.5">
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        <Flame className="h-3.5 w-3.5 text-[var(--color-accent)]" />
        Discover
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2.5 text-[12px] font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-primary)]"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" />
            {label}
          </Link>
        ))}
      </div>
    </section>
  );
}
