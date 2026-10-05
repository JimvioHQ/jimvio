"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type {
  GroupFilterStatus,
  GroupSortOption,
  GroupViewMode,
  OwnerGroupAction,
  OwnerGroupListItem,
  UpdateOwnerGroupInput,
} from "@/lib/community/owner-console/groups";

export function useOwnerGroups(communityId: string | null) {
  const [groups, setGroups] = useState<OwnerGroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GroupFilterStatus>("all");
  const [sort, setSort] = useState<GroupSortOption>("sort_order");
  const [view, setView] = useState<GroupViewMode>("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includeArchived, setIncludeArchived] = useState(false);

  const load = useCallback(async () => {
    if (!communityId) {
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
      const res = await fetch(`/api/c/owner/groups?${params.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          typeof data?.error === "string" ? data.error : "Failed to load Spaces"
        );
        // Keep prior groups on soft failure — never pretend the community has none.
        return;
      }
      if (!Array.isArray(data.groups)) {
        setError("Invalid Spaces response");
        return;
      }
      setGroups(data.groups);
    } catch {
      setError("Failed to load Spaces");
    } finally {
      setLoading(false);
    }
  }, [communityId, includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    let list = [...groups];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.description ?? "").toLowerCase().includes(q) ||
          g.slug.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "active":
        list = list.filter((g) => g.status === "active");
        break;
      case "archived":
        list = list.filter((g) => g.status === "archived");
        break;
      case "featured":
        list = list.filter((g) => g.isFeatured);
        break;
      case "hidden":
        list = list.filter((g) => g.isHidden);
        break;
      case "locked":
        list = list.filter((g) => g.isLocked);
        break;
      default:
        break;
    }
    list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "members":
          return b.memberCount - a.memberCount;
        case "channels":
          return b.channelCount - a.channelCount;
        case "created":
          return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
        case "activity":
          return (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
        default:
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return a.sortOrder - b.sortOrder;
      }
    });
    return list;
  }, [groups, search, filter, sort]);

  const runAction = useCallback(
    async (groupId: string, action: OwnerGroupAction, hard = false) => {
      const res = await fetch(`/api/c/owner/groups/${groupId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hard }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return false;
      }
      toast.success(
        action === "duplicate"
          ? "Group duplicated"
          : action === "delete"
            ? "Group deleted"
            : `Group ${action.replace(/^un/, "un-")} applied`
      );
      await load();
      return true;
    },
    [load]
  );

  const updateGroup = useCallback(
    async (groupId: string, patch: UpdateOwnerGroupInput) => {
      const res = await fetch(`/api/c/owner/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Update failed");
        return null;
      }
      toast.success("Group updated");
      await load();
      return data.group as OwnerGroupListItem;
    },
    [load]
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      if (!communityId) return;
      setGroups((prev) => {
        const map = new Map(prev.map((g) => [g.id, g]));
        return orderedIds
          .map((id, index) => {
            const g = map.get(id);
            return g ? { ...g, sortOrder: index } : null;
          })
          .filter((g): g is OwnerGroupListItem => Boolean(g))
          .concat(prev.filter((g) => !orderedIds.includes(g.id)));
      });
      const res = await fetch("/api/c/owner/groups/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, orderedIds }),
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
    async (action: OwnerGroupAction) => {
      for (const id of selectedIds) {
        await runAction(id, action);
      }
      clearSelection();
    },
    [selectedIds, runAction, clearSelection]
  );

  return {
    groups: visible,
    allGroups: groups,
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
    selectedIds,
    toggleSelect,
    clearSelection,
    bulkAction,
    includeArchived,
    setIncludeArchived,
    load,
    runAction,
    updateGroup,
    reorder,
  };
}
