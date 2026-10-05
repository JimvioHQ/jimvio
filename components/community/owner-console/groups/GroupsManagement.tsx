"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  LayoutGrid,
  List,
  Plus,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  GROUP_FILTER_STATUSES,
  GROUP_SORT_OPTIONS,
} from "@/lib/community/owner-console/groups";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { CreateGroupWizard } from "./CreateGroupWizard";
import { GroupsList } from "./GroupsList";
import { useOwnerGroups } from "./useOwnerGroups";

export function GroupsManagement() {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const canManage = hasCapability(role, "group.manage");
  const [createOpen, setCreateOpen] = useState(false);

  const {
    groups,
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
    reorder,
  } = useOwnerGroups(community?.id ?? null);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canManage) {
      setCreateOpen(true);
    }
  }, [searchParams, canManage]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to manage Spaces.
      </p>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-10 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          Spaces management requires Owner or Admin
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) cannot manage Spaces.
        </p>
      </div>
    );
  }

  const hasActiveSpace = groups.some((g) => g.status !== "archived");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-[#111827]">
            Spaces
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Organize conversations and collaboration for {community.name}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Spaces…"
            className="h-10 pl-9"
            aria-label="Search Spaces"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as (typeof GROUP_FILTER_STATUSES)[number])
            }
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Filter Spaces"
          >
            {GROUP_FILTER_STATUSES.map((f) => (
              <option key={f} value={f}>
                {f === "all" ? "All statuses" : f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value as (typeof GROUP_SORT_OPTIONS)[number])
            }
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Sort Spaces"
          >
            <option value="sort_order">Manual order</option>
            <option value="name">Name</option>
            <option value="members">Members</option>
            <option value="channels">Rooms</option>
            <option value="created">Created</option>
            <option value="activity">Activity</option>
          </select>
          <div className="inline-flex rounded-md border border-[var(--color-border)] p-0.5">
            <button
              type="button"
              aria-label="Card view"
              aria-pressed={view === "cards"}
              onClick={() => setView("cards")}
              className={`rounded px-2 py-1.5 ${
                view === "cards"
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              aria-pressed={view === "table"}
              onClick={() => setView("table")}
              className={`rounded px-2 py-1.5 ${
                view === "table"
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <label className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-muted)]">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Archived
          </label>
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={hasActiveSpace}
            title={
              hasActiveSpace
                ? "Each community supports one Space. Edit the existing Space instead."
                : undefined
            }
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Space
          </Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2">
          <span className="text-[12px] font-semibold text-[var(--color-text-secondary)]">
            {selectedIds.length} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void bulkAction("feature")}
          >
            <Star className="mr-1 h-3.5 w-3.5" />
            Feature
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void bulkAction("archive")}
          >
            <Archive className="mr-1 h-3.5 w-3.5" />
            Archive
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          <p className="font-semibold">Couldn’t load Spaces</p>
          <p className="mt-0.5 text-[13px]">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-[12px] font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
          Loading Spaces…
        </div>
      ) : error && groups.length === 0 ? null : (
        <GroupsList
          groups={groups}
          view={view}
          communitySlug={community.slug}
          communityMemberCount={community.memberCount}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onAction={(id, action) => void runAction(id, action)}
          onDragReorder={(ids) => void reorder(ids)}
        />
      )}

      <CreateGroupWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        onCreated={() => void load()}
      />
    </div>
  );
}
