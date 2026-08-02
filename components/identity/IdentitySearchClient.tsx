"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Building2,
  Loader2,
  MessageSquare,
  Radio,
  Search,
  ShoppingBag,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import type { DiscoveryEntityType, DiscoveryHit } from "@/lib/discovery/types";
import { IdentityCard, IdentityEmptyState, IdentityPill, cn } from "@/components/identity/identity-ui";

const ENTITY_META: Record<DiscoveryEntityType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  community: { label: "Community", icon: Users },
  space: { label: "Space", icon: Users },
  post: { label: "Post", icon: MessageSquare },
  message: { label: "Message", icon: MessageSquare },
  course: { label: "Course", icon: BookOpen },
  lesson: { label: "Lesson", icon: BookOpen },
  product: { label: "Product", icon: ShoppingBag },
  creator: { label: "Creator", icon: User },
  live: { label: "Live", icon: Radio },
  campaign: { label: "Campaign", icon: Sparkles },
  digital: { label: "Digital product", icon: ShoppingBag },
  organization: { label: "Organization", icon: Building2 },
};

export function IdentitySearchClient() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<DiscoveryHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [tookMs, setTookMs] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setResults([]);
      setTookMs(null);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/identity/search?q=${encodeURIComponent(debounced)}&limit=30`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        setResults(json.items ?? []);
        setTookMs(json.tookMs ?? null);
      })
      .catch(() => active && setResults([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const grouped = useMemo(() => {
    const map = new Map<DiscoveryEntityType, DiscoveryHit[]>();
    for (const hit of results) {
      if (!map.has(hit.entityType)) map.set(hit.entityType, []);
      map.get(hit.entityType)!.push(hit);
    }
    return Array.from(map.entries());
  }, [results]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A9388]">Jimvio Identity</p>
        <h1 className="font-[var(--font-identity-serif)] text-[26px] font-medium tracking-tight text-[#161512]">
          Search Jimvio
        </h1>
      </div>

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B9B3A6]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search creators, products, communities, courses…"
          className="h-[52px] w-full rounded-2xl border border-black/[0.08] bg-white py-3.5 pl-11 pr-4 text-[14.5px] text-[#1C1B19] shadow-[0_1px_2px_rgba(20,18,15,0.04)] outline-none transition-colors placeholder:text-[#B9B3A6] focus:border-[#FF5A1F]"
        />
        {loading && <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#FF5A1F]" />}
      </div>

      {debounced.length < 2 ? (
        <IdentityEmptyState icon={<Search className="h-6 w-6" />} title="Search across all of Jimvio" description="Find creators, products, communities, courses and more." />
      ) : !loading && results.length === 0 ? (
        <IdentityEmptyState title="No results" description={`Nothing matched "${debounced}".`} />
      ) : (
        <div className="space-y-6">
          {tookMs != null && <p className="text-[11px] text-[#B9B3A6]">{results.length} results · {tookMs}ms</p>}
          {grouped.map(([type, hits]) => {
            const meta = ENTITY_META[type];
            const Icon = meta.icon;
            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9A9388]">
                  <Icon className="h-3 w-3" />
                  {meta.label}s
                </div>
                <div className="space-y-1.5">
                  {hits.map((hit) => (
                    <Link key={hit.id} href={hit.href}>
                      <IdentityCard interactive className="flex items-center gap-3 p-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black/[0.04]">
                          {hit.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={hit.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Icon className="h-4 w-4 text-[#9A9388]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] font-semibold text-[#1C1B19]">{hit.title}</p>
                          {hit.subtitle && <p className="truncate text-[12px] text-[#9A9388]">{hit.subtitle}</p>}
                        </div>
                        <IdentityPill tone="neutral" className={cn("shrink-0")}>
                          {meta.label}
                        </IdentityPill>
                      </IdentityCard>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
