"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  LayoutGrid,
  List,
  Lock,
  Plus,
  Search,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hasCapability } from "@/lib/community/workspace/permissions";
import {
  CHANNEL_FILTER_STATUSES,
  CHANNEL_KIND_LABELS,
  OWNER_CHANNEL_KINDS,
} from "@/lib/community/owner-console/channels";
import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import { CreateChannelWizard } from "./CreateChannelWizard";
import { ChannelsList } from "./ChannelsList";
import { useOwnerChannels } from "./useOwnerChannels";

export function ChannelsManagement() {
  const { community, role } = useOwnerConsole();
  const searchParams = useSearchParams();
  const canManage = hasCapability(role, "channel.manage");
  const [createOpen, setCreateOpen] = useState(false);

  const {
    channels,
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
  } = useOwnerChannels(community?.id ?? null);

  useEffect(() => {
    if (searchParams.get("action") === "create" && canManage) {
      setCreateOpen(true);
    }
  }, [searchParams, canManage]);

  if (!community) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Select a community to manage channels.
      </p>
    );
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] px-5 py-10 text-center">
        <p className="text-sm font-semibold">
          Channels management requires Owner or Admin
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Your current role ({role}) does not include channel.manage.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels, groups, types, moderators…"
            className="h-10 pl-9"
            aria-label="Search channels"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Filter by group"
          >
            <option value="all">All groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={kindFilter}
            onChange={(e) =>
              setKindFilter(e.target.value as typeof kindFilter)
            }
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            {OWNER_CHANNEL_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHANNEL_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as (typeof CHANNEL_FILTER_STATUSES)[number])
            }
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Filter by status"
          >
            {CHANNEL_FILTER_STATUSES.map((f) => (
              <option key={f} value={f}>
                {f === "all" ? "All statuses" : f[0].toUpperCase() + f.slice(1)}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
            aria-label="Sort channels"
          >
            <option value="sort_order">Manual / group order</option>
            <option value="name">Name</option>
            <option value="group">Group</option>
            <option value="messages">Messages</option>
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
            disabled={groups.length === 0}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Channel
          </Button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-[13px] text-amber-700 dark:text-amber-400">
          Create a group first before adding channels.
        </p>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-2">
          <span className="text-[12px] font-semibold">
            {selectedIds.length} selected
          </span>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("archive")}>
            <Archive className="mr-1 h-3.5 w-3.5" />
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("lock")}>
            <Lock className="mr-1 h-3.5 w-3.5" />
            Lock
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("unlock")}>
            <Unlock className="mr-1 h-3.5 w-3.5" />
            Unlock
          </Button>
          <Button size="sm" variant="outline" onClick={() => void bulkAction("duplicate")}>
            Duplicate
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            Clear
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-rose-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="rounded-2xl border border-[var(--color-border)] px-6 py-16 text-center text-sm text-[var(--color-text-muted)]">
          Loading channels…
        </div>
      ) : (
        <ChannelsList
          channels={channels}
          view={view}
          communityId={community.id}
          groups={groups}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onAction={(id, action, extra) => void runAction(id, action, extra)}
          onDragReorder={(ids, groupId) => void reorder(ids, groupId)}
        />
      )}

      <CreateChannelWizard
        open={createOpen}
        onOpenChange={setCreateOpen}
        communityId={community.id}
        groups={groups}
        onCreated={() => void load()}
      />
    </div>
  );
}
