"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  ChannelFilterStatus,
  ChannelSortOption,
  ChannelTemplate,
  ChannelViewMode,
  OwnerChannelAction,
  OwnerChannelKind,
  OwnerChannelListItem,
} from "@/lib/community/owner-console/channels";

export type ChannelGroupOption = {
  id: string;
  name: string;
  slug: string;
};

export function useOwnerChannels(communityId: string | null) {
  const [channels, setChannels] = useState<OwnerChannelListItem[]>([]);
  const [groups, setGroups] = useState<ChannelGroupOption[]>([]);
  const [templates, setTemplates] = useState<ChannelTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ChannelFilterStatus>("all");
  const [sort, setSort] = useState<ChannelSortOption>("sort_order");
  const [view, setView] = useState<ChannelViewMode>("cards");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [kindFilter, setKindFilter] = useState<OwnerChannelKind | "all">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) {
      setChannels([]);
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        communityId,
        includeArchived: includeArchived ? "1" : "0",
      });
      const res = await fetch(`/api/c/owner/channels?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load channels");
        setChannels([]);
        return;
      }
      setChannels(data.channels ?? []);
      setGroups(data.groups ?? []);
      setTemplates(data.templates ?? []);
    } catch {
      setError("Failed to load channels");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [communityId, includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    let list = [...channels];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description ?? "").toLowerCase().includes(q) ||
          c.groupName.toLowerCase().includes(q) ||
          c.kind.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)) ||
          c.moderators.some((m) =>
            (m.fullName || m.username || "").toLowerCase().includes(q)
          )
      );
    }
    if (groupFilter !== "all") {
      list = list.filter((c) => c.groupId === groupFilter);
    }
    if (kindFilter !== "all") {
      list = list.filter((c) => c.kind === kindFilter);
    }
    switch (filter) {
      case "active":
        list = list.filter((c) => c.status === "active");
        break;
      case "archived":
        list = list.filter((c) => c.status === "archived");
        break;
      case "featured":
        list = list.filter((c) => c.isFeatured);
        break;
      case "hidden":
        list = list.filter((c) => c.isHidden);
        break;
      case "locked":
        list = list.filter((c) => c.isLocked);
        break;
      case "recent":
        list = list.filter((c) => {
          if (!c.lastActivityAt) return false;
          const age = Date.now() - new Date(c.lastActivityAt).getTime();
          return age < 7 * 24 * 60 * 60 * 1000;
        });
        break;
      case "unread":
        // Shell filter — no unread store yet; show recently active as proxy
        list = list.filter((c) => (c.messageCount ?? 0) > 0);
        break;
      default:
        break;
    }
    list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "group":
          return a.groupName.localeCompare(b.groupName) || a.sortOrder - b.sortOrder;
        case "messages":
          return b.messageCount - a.messageCount;
        case "created":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        case "activity":
          return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
        default:
          if (a.groupId !== b.groupId) {
            return a.groupName.localeCompare(b.groupName);
          }
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return a.sortOrder - b.sortOrder;
      }
    });
    return list;
  }, [channels, search, filter, sort, groupFilter, kindFilter]);

  const runAction = useCallback(
    async (
      channelId: string,
      action: OwnerChannelAction,
      extra?: { hard?: boolean; targetGroupId?: string }
    ) => {
      const res = await fetch(`/api/c/owner/channels/${channelId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return false;
      }
      toast.success(
        action === "duplicate" || action === "clone"
          ? "Channel duplicated"
          : action === "move"
            ? "Channel moved"
            : `Channel ${action} applied`
      );
      await load();
      return true;
    },
    [load]
  );

  const reorder = useCallback(
    async (orderedIds: string[], groupId?: string) => {
      if (!communityId) return;
      setChannels((prev) => {
        const map = new Map(prev.map((c) => [c.id, c]));
        const reordered = orderedIds
          .map((id, index) => {
            const c = map.get(id);
            return c ? { ...c, sortOrder: index } : null;
          })
          .filter((c): c is OwnerChannelListItem => Boolean(c));
        const rest = prev.filter((c) => !orderedIds.includes(c.id));
        return [...reordered, ...rest];
      });
      const res = await fetch("/api/c/owner/channels/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          communityId,
          groupId,
          orderedIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Reorder failed");
        await load();
      }
    },
    [communityId, load]
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const bulkAction = useCallback(
    async (action: OwnerChannelAction, targetGroupId?: string) => {
      for (const id of selectedIds) {
        await runAction(id, action, { targetGroupId });
      }
      clearSelection();
    },
    [selectedIds, runAction, clearSelection]
  );

  return {
    channels: visible,
    allChannels: channels,
    groups,
    templates,
    loading,
    error,
    search,
    setSearch,
    filter,
    setFilter,
    sort,
    setSort,
    view,
    setView,
    groupFilter,
    setGroupFilter,
    kindFilter,
    setKindFilter,
    selectedIds,
    toggleSelect,
    clearSelection,
    bulkAction,
    includeArchived,
    setIncludeArchived,
    load,
    runAction,
    reorder,
  };
}
