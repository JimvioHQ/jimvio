"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommandSearchProvider } from "@/lib/command-center/search";
import type { CommandGroup, CommandResult } from "@/lib/command-center/types";
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
  // Members includes raw "creator" hits alongside dedicated "member" results.
  members: (item) => item.kind === "member" || item.kind === "creator",
  // AI includes ai / ai-answer kinds plus any command explicitly badged "AI".
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

const SEARCH_DEBOUNCE_MS = 80;

export function useCommandCenterSearch(
  query: string,
  filter: CommandCenterFilter,
  refreshKey = 0,
) {
  const [groups, setGroups] = useState<CommandGroup[]>([]);
  const [flat, setFlat] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    const id = window.setTimeout(() => {
      void getCommandSearchProvider()
        .search({ query, limit: 32, signal: controller.signal })
        .then((result) => {
          if (cancelled) return;
          const filteredGroups = applyFilter(result.groups, filter);
          const filteredFlat = applyFilter(
            [{ id: "flat", label: "Results", items: result.flat }],
            filter,
          )[0]?.items ?? [];
          setGroups(filteredGroups);
          setFlat(filteredFlat.length ? filteredFlat : filteredGroups.flatMap((g) => g.items));
        })
        .catch(() => {
          // Aborted or failed — swallow, a newer cycle is already in flight.
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query.trim() ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(id);
    };
  }, [query, filter, refreshKey]);

  const navigable = useMemo(() => {
    if (flat.length) return flat;
    return groups.flatMap((g) => g.items);
  }, [flat, groups]);

  return { groups, flat: navigable, loading };
}
