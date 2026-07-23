"use client";

import Link from "next/link";
import {
  Archive,
  Copy,
  EyeOff,
  GripVertical,
  Lock,
  MoreHorizontal,
  Pin,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sectionPath } from "@/lib/community/owner-console";
import {
  GROUP_PRIVACY_LABELS,
  GROUP_STATUS_LABELS,
  type OwnerGroupAction,
  type OwnerGroupListItem,
  type GroupViewMode,
} from "@/lib/community/owner-console/groups";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function StatusPill({ group }: { group: OwnerGroupListItem }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        group.status === "active" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        group.status === "archived" &&
          "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        group.status === "hidden" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        group.status === "locked" &&
          "bg-rose-500/10 text-rose-700 dark:text-rose-400"
      )}
    >
      {GROUP_STATUS_LABELS[group.status]}
    </span>
  );
}

export function GroupsList({
  groups,
  view,
  communityId,
  selectedIds,
  onToggleSelect,
  onAction,
  onDragReorder,
}: {
  groups: OwnerGroupListItem[];
  view: GroupViewMode;
  communityId: string;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onAction: (id: string, action: OwnerGroupAction) => void;
  onDragReorder: (orderedIds: string[]) => void;
}) {
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/group-id", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/group-id");
    if (!sourceId || sourceId === targetId) return;
    const ids = groups.map((g) => g.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    onDragReorder(next);
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          No groups match your filters
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Create a group to organize members, channels, and collaboration.
        </p>
      </div>
    );
  }

  if (view === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--color-surface-secondary)]/60 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3">Group</th>
              <th className="px-3 py-3">Visibility</th>
              <th className="px-3 py-3">Members</th>
              <th className="px-3 py-3">Channels</th>
              <th className="px-3 py-3">Created</th>
              <th className="px-3 py-3">Activity</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr
                key={g.id}
                draggable
                onDragStart={(e) => onDragStart(e, g.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, g.id)}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]/40"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(g.id)}
                    onChange={() => onToggleSelect(g.id)}
                    aria-label={`Select ${g.name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-lg">{g.icon ?? "💬"}</span>
                    <div>
                      <Link
                        href={sectionPath(
                          `/community-owner/groups/${g.id}`,
                          communityId
                        )}
                        className="font-semibold text-[var(--color-text-primary)] hover:underline"
                      >
                        {g.name}
                      </Link>
                      <p className="line-clamp-1 text-[12px] text-[var(--color-text-muted)]">
                        {g.description || g.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">{GROUP_PRIVACY_LABELS[g.privacy]}</td>
                <td className="px-3 py-3">{g.memberCount}</td>
                <td className="px-3 py-3">{g.channelCount}</td>
                <td className="px-3 py-3">{formatDate(g.createdAt)}</td>
                <td className="px-3 py-3">{formatDate(g.lastActivityAt)}</td>
                <td className="px-3 py-3">
                  <StatusPill group={g} />
                </td>
                <td className="px-3 py-3">
                  <GroupActionsMenu
                    group={g}
                    communityId={communityId}
                    onAction={onAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" role="list">
      {groups.map((g) => (
        <li
          key={g.id}
          draggable
          onDragStart={(e) => onDragStart(e, g.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, g.id)}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-md",
            selectedIds.includes(g.id) && "ring-2 ring-[var(--color-accent)]"
          )}
        >
          <div
            className="h-20 w-full bg-[var(--color-surface-secondary)]"
            style={{
              background: g.coverUrl
                ? `center/cover url(${g.coverUrl})`
                : `linear-gradient(135deg, ${g.color ?? "#0F766E"}33, transparent)`,
            }}
          />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.includes(g.id)}
                  onChange={() => onToggleSelect(g.id)}
                  aria-label={`Select ${g.name}`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl leading-none">{g.icon ?? "💬"}</span>
                    <Link
                      href={sectionPath(
                        `/community-owner/groups/${g.id}`,
                        communityId
                      )}
                      className="truncate text-[15px] font-bold text-[var(--color-text-primary)] hover:underline"
                    >
                      {g.name}
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
                    {g.description || "No description"}
                  </p>
                </div>
              </div>
              <GroupActionsMenu
                group={g}
                communityId={communityId}
                onAction={onAction}
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <StatusPill group={g} />
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                {GROUP_PRIVACY_LABELS[g.privacy]}
              </span>
              {g.isFeatured && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  <Star className="h-3 w-3" /> Featured
                </span>
              )}
              {g.isPinned && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                  <Pin className="h-3 w-3" /> Pinned
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--color-text-muted)]">
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {g.memberCount}
                </span>{" "}
                members
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {g.channelCount}
                </span>{" "}
                channels
              </div>
              <div>Created {formatDate(g.createdAt)}</div>
              <div>Active {formatDate(g.lastActivityAt)}</div>
            </div>

            {g.moderators.length > 0 && (
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                Mods:{" "}
                {g.moderators
                  .map((m) => m.fullName || m.username || "Member")
                  .join(", ")}
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
                <GripVertical className="h-3.5 w-3.5" /> Drag to reorder
              </span>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link
                  href={sectionPath(
                    `/community-owner/groups/${g.id}`,
                    communityId
                  )}
                >
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  Settings
                </Link>
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function GroupActionsMenu({
  group,
  communityId,
  onAction,
}: {
  group: OwnerGroupListItem;
  communityId: string;
  onAction: (id: string, action: OwnerGroupAction) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Actions for ${group.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link
            href={sectionPath(
              `/community-owner/groups/${group.id}`,
              communityId
            )}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Edit / Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction(group.id, "duplicate")}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onAction(group.id, group.isFeatured ? "unfeature" : "feature")
          }
        >
          <Star className="mr-2 h-4 w-4" />
          {group.isFeatured ? "Unfeature" : "Feature"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction(group.id, group.isPinned ? "unpin" : "pin")}
        >
          <Pin className="mr-2 h-4 w-4" />
          {group.isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction(group.id, group.isHidden ? "unhide" : "hide")}
        >
          <EyeOff className="mr-2 h-4 w-4" />
          {group.isHidden ? "Unhide" : "Hide"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAction(group.id, group.isLocked ? "unlock" : "lock")}
        >
          <Lock className="mr-2 h-4 w-4" />
          {group.isLocked ? "Unlock" : "Lock"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {group.status === "archived" ? (
          <DropdownMenuItem onClick={() => onAction(group.id, "restore")}>
            <Archive className="mr-2 h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            disabled={group.isSystem}
            onClick={() => onAction(group.id, "archive")}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={group.isSystem}
          className="text-rose-600 focus:text-rose-600"
          onClick={() => {
            if (
              window.confirm(
                `Delete “${group.name}”? This archives the group. Hard delete is available in Danger Zone.`
              )
            ) {
              onAction(group.id, "delete");
            }
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
