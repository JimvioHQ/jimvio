"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getCommandSearchProvider } from "@/lib/command-center/search";
import type { CommandGroup, CommandResult, CommandSearchOutput } from "@/lib/command-center/types";
import type { CommandCenterFilter } from "@/lib/store/use-command-center-store";

type FilterPredicate = (item: CommandResult) => boolean;

const KIND_SETS: Record<string, Set<string>> = {
  products: new Set(["product", "store", "course"]),
  communities: new Set(["community", "creator", "channel", "event"]),
  campaigns: new Set(["affiliate-campaign", "ugc-campaign"]),
  commands: new Set(["command", "page", "setting", "help"]),
  content: new Set(["post", "channel", "event", "knowledge", "course"]),
  orders: new Set(["order"]),
  messages: new Set(["message"]),
};

const FILTER_PREDICATES: Record<CommandCenterFilter, FilterPredicate | null> = {
  all: null,
  products: (item) => KIND_SETS.products.has(item.kind),
  communities: (item) => KIND_SETS.communities.has(item.kind),
  campaigns: (item) => KIND_SETS.campaigns.has(item.kind),
  commands: (item) => KIND_SETS.commands.has(item.kind) || item.kind === "command",
  content: (item) => KIND_SETS.content.has(item.kind),
  orders: (item) => KIND_SETS.orders.has(item.kind),
  messages: (item) => KIND_SETS.messages.has(item.kind),
  members: (item) => item.kind === "member" || item.kind === "creator",
  ai: (item) =>
    item.kind === "ai" || item.kind === "ai-answer" || (item.kind === "command" && item.badge === "AI"),
};

function applyFilter(groups: CommandGroup[], filter: CommandCenterFilter): CommandGroup[] {
  const predicate = FILTER_PREDICATES[filter];
  if (!predicate) return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter(predicate) }))
    .filter((g) => g.items.length > 0);
}

function applyFilterFlat(items: CommandResult[], filter: CommandCenterFilter): CommandResult[] {
  const predicate = FILTER_PREDICATES[filter];
  if (!predicate) return items;
  return items.filter(predicate);
}

/** 150–250ms range — balances snappy typing with fewer duplicate network calls. */
const SEARCH_DEBOUNCE_MS = 180;
const CLIENT_CACHE_TTL_MS = 12_000;
const CLIENT_CACHE_MAX = 24;

type CacheEntry = { at: number; result: CommandSearchOutput };

const clientSearchCache = new Map<string, CacheEntry>();

function cacheKey(query: string) {
  return query.trim().toLowerCase();
}

function readCache(query: string): CommandSearchOutput | null {
  const key = cacheKey(query);
  const hit = clientSearchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CLIENT_CACHE_TTL_MS) {
    clientSearchCache.delete(key);
    return null;
  }
  return hit.result;
}

function writeCache(query: string, result: CommandSearchOutput) {
  const key = cacheKey(query);
  clientSearchCache.set(key, { at: Date.now(), result });
  if (clientSearchCache.size > CLIENT_CACHE_MAX) {
    const oldest = clientSearchCache.keys().next().value;
    if (oldest) clientSearchCache.delete(oldest);
  }
}

export function useCommandCenterSearch(
  query: string,
  filter: CommandCenterFilter,
  refreshKey = 0,
) {
  const [raw, setRaw] = useState<CommandSearchOutput>({ groups: [], flat: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const q = query.trim();
    const requestId = ++requestIdRef.current;

    const cached = readCache(q);
    if (cached) {
      setRaw(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    const id = window.setTimeout(() => {
      void getCommandSearchProvider()
        .search({ query: q, limit: 32, signal: controller.signal })
        .then((result) => {
          if (cancelled || requestId !== requestIdRef.current) return;
          writeCache(q, result);
          setRaw(result);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled || requestId !== requestIdRef.current) return;
          if (controller.signal.aborted) return;
          // Keep prior results usable; surface a compact recoverable error.
          setError(err instanceof Error ? err.message : "Search failed. Try again.");
        })
        .finally(() => {
          if (!cancelled && requestId === requestIdRef.current) setLoading(false);
        });
    }, q ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(id);
    };
  }, [query, refreshKey, retryTick]);

  const groups = useMemo(() => applyFilter(raw.groups, filter), [raw.groups, filter]);
  const flat = useMemo(() => {
    const filteredFlat = applyFilterFlat(raw.flat, filter);
    if (filteredFlat.length) return filteredFlat;
    return groups.flatMap((g) => g.items);
  }, [raw.flat, filter, groups]);

  const retry = () => {
    clientSearchCache.delete(cacheKey(query));
    setRetryTick((n) => n + 1);
  };

  return { groups, flat, loading, error, retry };
}
