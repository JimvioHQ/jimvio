"use client";

import { useEffect, useMemo, useState } from "react";
import { getCommandSearchProvider } from "@/lib/command-center/search";
import type { CommandGroup, CommandResult } from "@/lib/command-center/types";
import type { CommandCenterFilter } from "@/lib/store/use-command-center-store";

const FILTER_KINDS: Record<CommandCenterFilter, Set<string> | null> = {
  all: null,
  products: new Set(["product", "store", "course"]),
  communities: new Set(["community", "creator"]),
  campaigns: new Set(["affiliate-campaign", "ugc-campaign"]),
  commands: new Set(["command", "page", "setting", "help", "order"]),
  ai: new Set(["ai", "ai-answer"]),
  members: new Set(["member"]),
  content: new Set(["post", "message", "channel", "event", "knowledge"]),
};

function applyFilter(groups: CommandGroup[], filter: CommandCenterFilter): CommandGroup[] {
  const allowed = FILTER_KINDS[filter];
  if (!allowed) return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => allowed.has(i.kind)) }))
    .filter((g) => g.items.length > 0);
}

export function useCommandCenterSearch(query: string, filter: CommandCenterFilter) {
  const [groups, setGroups] = useState<CommandGroup[]>([]);
  const [flat, setFlat] = useState<CommandResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const id = window.setTimeout(() => {
      void getCommandSearchProvider()
        .search({ query, limit: 32 })
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
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, query.trim() ? 120 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query, filter]);

  const navigable = useMemo(() => {
    if (flat.length) return flat;
    return groups.flatMap((g) => g.items);
  }, [flat, groups]);

  return { groups, flat: navigable, loading };
}
