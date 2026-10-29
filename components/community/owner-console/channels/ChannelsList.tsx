"use client";

import { useOwnerConsole } from "@/components/community/owner-console/OwnerConsoleContext";
import Link from "next/link";
import {
  Archive,
  Copy,
  EyeOff,
  FolderInput,
  GripVertical,
  Lock,
  MoreHorizontal,
  Pin,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHANNEL_KIND_LABELS,
  CHANNEL_VISIBILITY_LABELS,
  type OwnerChannelAction,
  type OwnerChannelListItem,
  type ChannelViewMode,
} from "@/lib/community/owner-console/channels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ChannelGroupOption } from "./useOwnerChannels";

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

export function ChannelsList({
  channels,
  view,
  communitySlug,
  groups,
  selectedIds,
  onToggleSelect,
  onAction,
  onDragReorder,
}: {
  channels: OwnerChannelListItem[];
  view: ChannelViewMode;
  communitySlug: string;
  groups: ChannelGroupOption[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onAction: (
    id: string,
    action: OwnerChannelAction,
    extra?: { targetGroupId?: string }
  ) => void;
  onDragReorder: (orderedIds: string[], groupId?: string) => void;
}) {
  const { hrefSection } = useOwnerConsole();
  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData("text/channel-id", id);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData("text/channel-id");
    if (!sourceId || sourceId === targetId) return;
    const target = channels.find((c) => c.id === targetId);
    const source = channels.find((c) => c.id === sourceId);
    if (!target || !source) return;
    const sameGroup = channels.filter((c) => c.groupId === target.groupId);
    const ids = sameGroup.map((c) => c.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    onDragReorder(next, target.groupId);
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">
          No channels match your filters
        </p>
        <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
          Create a channel to start collaboration inside a group.
        </p>
      </div>
    );
  }

  if (view === "table") {
    return (
      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border)]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-[var(--color-surface-secondary)]/60 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-3 w-8" />
              <th className="px-3 py-3">Channel</th>
              <th className="px-3 py-3">Group</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Visibility</th>
              <th className="px-3 py-3">Messages</th>
              <th className="px-3 py-3">Activity</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {channels.map((c) => (
              <tr
                key={c.id}
                draggable
                onDragStart={(e) => onDragStart(e, c.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, c.id)}
                className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)]/40"
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => onToggleSelect(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-lg">{c.emoji ?? c.icon ?? "💬"}</span>
                    <div>
                      <Link
                        href={hrefSection(`channels/${c.id}`)}
                        className="font-semibold hover:underline"
                      >
                        {c.name}
                      </Link>
                      <p className="line-clamp-1 text-[12px] text-[var(--color-text-muted)]">
                        {c.description || c.slug}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">{c.groupName}</td>
                <td className="px-3 py-3">{CHANNEL_KIND_LABELS[c.kind]}</td>
                <td className="px-3 py-3">
                  {CHANNEL_VISIBILITY_LABELS[c.visibility]}
                </td>
                <td className="px-3 py-3">{c.messageCount}</td>
                <td className="px-3 py-3">{formatDate(c.lastActivityAt)}</td>
                <td className="px-3 py-3 capitalize">{c.status}</td>
                <td className="px-3 py-3">
                  <ChannelActionsMenu
                    channel={c}
                    communitySlug={communitySlug}
                    groups={groups}
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
      {channels.map((c) => (
        <li
          key={c.id}
          draggable
          onDragStart={(e) => onDragStart(e, c.id)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, c.id)}
          className={cn(
            "overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition-shadow hover:shadow-md",
            selectedIds.includes(c.id) && "ring-2 ring-[var(--color-accent)]"
          )}
        >
          <div
            className="h-16 w-full"
            style={{
              background: `linear-gradient(135deg, ${c.color ?? "#0F766E"}44, transparent)`,
            }}
          />
          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => onToggleSelect(c.id)}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.emoji ?? c.icon ?? "💬"}</span>
                    <Link
                      href={hrefSection(`channels/${c.id}`)}
                      className="truncate text-[15px] font-bold hover:underline"
                    >
                      {c.name}
                    </Link>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
                    {c.description || "No description"}
                  </p>
                </div>
              </div>
              <ChannelActionsMenu
                channel={c}
                communitySlug={communitySlug}
                groups={groups}
                onAction={onAction}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5">
                {c.groupName}
              </span>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5">
                {CHANNEL_KIND_LABELS[c.kind]}
              </span>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5">
                {CHANNEL_VISIBILITY_LABELS[c.visibility]}
              </span>
              <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 capitalize">
                {c.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[12px] text-[var(--color-text-muted)]">
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {c.memberCount}
                </span>{" "}
                members
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {c.messageCount}
                </span>{" "}
                messages
              </div>
              <div>
                <span className="font-semibold text-[var(--color-text-primary)]">
                  {c.pinnedCount}
                </span>{" "}
                pins
              </div>
              <div>Active {formatDate(c.lastActivityAt)}</div>
            </div>
            {c.moderators.length > 0 && (
              <p className="truncate text-[11px] text-[var(--color-text-muted)]">
                Mods:{" "}
                {c.moderators
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
                  href={hrefSection(`channels/${c.id}`)}
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

function ChannelActionsMenu({
  channel,
  communitySlug,
  groups,
  onAction,
}: {
  channel: OwnerChannelListItem;
  communitySlug: string;
  groups: ChannelGroupOption[];
  onAction: (
    id: string,
    action: OwnerChannelAction,
    extra?: { targetGroupId?: string }
  ) => void;
}) {
  const { hrefSection } = useOwnerConsole();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link
            href={hrefSection(`channels/${channel.id}`)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Edit / Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction(channel.id, "duplicate")}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </DropdownMenuItem>
        {groups
          .filter((g) => g.id !== channel.groupId)
          .slice(0, 4)
          .map((g) => (
            <DropdownMenuItem
              key={g.id}
              onClick={() =>
                onAction(channel.id, "move", { targetGroupId: g.id })
              }
            >
              <FolderInput className="mr-2 h-4 w-4" />
              Move to {g.name}
            </DropdownMenuItem>
          ))}
        <DropdownMenuItem
          onClick={() =>
            onAction(channel.id, channel.isFeatured ? "unfeature" : "feature")
          }
        >
          <Star className="mr-2 h-4 w-4" />
          {channel.isFeatured ? "Unfeature" : "Feature"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onAction(channel.id, channel.isPinned ? "unpin" : "pin")
          }
        >
          <Pin className="mr-2 h-4 w-4" />
          {channel.isPinned ? "Unpin" : "Pin"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onAction(channel.id, channel.isHidden ? "unhide" : "hide")
          }
        >
          <EyeOff className="mr-2 h-4 w-4" />
          {channel.isHidden ? "Unhide" : "Hide"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            onAction(channel.id, channel.isLocked ? "unlock" : "lock")
          }
        >
          <Lock className="mr-2 h-4 w-4" />
          {channel.isLocked ? "Unlock" : "Lock"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {channel.status === "archived" ? (
          <DropdownMenuItem onClick={() => onAction(channel.id, "restore")}>
            <Archive className="mr-2 h-4 w-4" />
            Restore
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onAction(channel.id, "archive")}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => {
            if (window.confirm(`Delete “${channel.name}”?`)) {
              onAction(channel.id, "delete");
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
