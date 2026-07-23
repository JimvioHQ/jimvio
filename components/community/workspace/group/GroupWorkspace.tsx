"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  CheckSquare,
  Folder,
  Hash,
  LayoutList,
  MessageCircle,
  Pin,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GROUP_TABS,
  type GroupTabId,
  useCreatorOSStore,
} from "@/lib/community/os";
import {
  mapSpaceToGroup,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { EventCard, TaskCard } from "@/components/community/os/TaskEventCards";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";
import { createEventFromDraft } from "@/lib/community/os";
import { toast } from "sonner";

function roomTypeIcon(roomType: string): LucideIcon {
  switch (roomType) {
    case "chat":
      return MessageCircle;
    case "course":
      return BookOpen;
    case "posts":
      return Hash;
    case "resources":
      return Folder;
    case "tasks":
      return CheckSquare;
    default:
      return LayoutList;
  }
}

export function GroupTabs({
  active,
  onChange,
}: {
  active: GroupTabId;
  onChange: (id: GroupTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Group sections"
      className="flex gap-1 overflow-x-auto border-b border-[var(--color-border)] px-3 scrollbar-hide sm:px-4"
    >
      {GROUP_TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            id={`group-tab-${tab.id}`}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] font-semibold transition-colors",
              isActive
                ? "text-[#fd5000]"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            )}
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#fd5000]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Group = mini workspace (space). Reuses permissions via mapSpaceToGroup.
 */
export function GroupWorkspace({
  space,
  communityId,
  communitySlug,
  ownerId,
  userId,
  membership,
  memberCount,
  isStaff,
}: {
  space: WorkspaceSpaceRow;
  communityId: string;
  communitySlug: string;
  ownerId: string | null | undefined;
  userId: string | null | undefined;
  membership: MembershipLite | null;
  memberCount?: number;
  isStaff?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<GroupTabId>("overview");
  const group: WorkspaceGroup = useMemo(
    () =>
      mapSpaceToGroup(
        space,
        { userId, ownerId, membership },
        { memberCount: memberCount ?? 0, onlineCount: 0 }
      ),
    [space, userId, ownerId, membership, memberCount]
  );

  const roomIds = space.rooms.map((r) => r.id);
  const tasks = useCreatorOSStore((s) =>
    s.tasks.filter((t) => t.groupId === space.id || roomIds.includes(t.roomId ?? ""))
  );
  const events = useCreatorOSStore((s) =>
    s.events.filter(
      (e) => e.groupId === space.id || roomIds.includes(e.roomId ?? "")
    )
  );
  const addEvent = useCreatorOSStore((s) => s.addEvent);
  const cards = useCollaborationStore((s) =>
    s.cards.filter((c) => roomIds.includes(c.roomId))
  );

  function openRoom(roomId: string) {
    router.push(
      `/communities/${communitySlug}?space=${space.id}&room=${roomId}`
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
      <header className="shrink-0 border-b border-[var(--color-border)] px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-accent)]">
          Group workspace
        </p>
        <h2 className="text-[16px] font-bold text-[var(--color-text-primary)]">
          {group.name}
        </h2>
        {group.description && (
          <p className="mt-0.5 line-clamp-2 text-[12px] text-[var(--color-text-muted)]">
            {group.description}
          </p>
        )}
        <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
          {group.channels.length} channels · {group.memberCount} members
        </p>
      </header>

      <GroupTabs active={tab} onChange={setTab} />

      <div
        role="tabpanel"
        aria-labelledby={`group-tab-${tab}`}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {tab === "overview" && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Collaborate across channels, knowledge, resources, courses, and
              events inside this group.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {space.rooms.slice(0, 4).map((r) => {
                const Icon = roomTypeIcon(r.room_type);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openRoom(r.id)}
                    className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left hover:border-[var(--color-accent)]/40"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      {r.name}
                    </span>
                  </button>
                );
              })}
            </div>
            {tasks.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[12px] font-bold uppercase text-[var(--color-text-muted)]">
                  Open tasks
                </h3>
                {tasks.slice(0, 3).map((t) => (
                  <TaskCard key={t.id} task={t} canManage={isStaff} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "channels" && (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
            {space.rooms.map((r) => {
              const Icon = roomTypeIcon(r.room_type);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => openRoom(r.id)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left hover:bg-[var(--color-surface-secondary)]"
                  >
                    <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {r.name}
                    </span>
                    <span className="ml-auto text-[10px] uppercase text-[var(--color-text-muted)]">
                      {r.room_type}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {tab === "knowledge" && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {cards.length === 0 ? (
              <ChannelEmptyState
                icon={BookOpen}
                title="Group knowledge"
                description="Convert channel messages into guides and FAQs — they appear here across the group."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {cards.map((c) => (
                  <li key={c.id}>
                    <KnowledgeCardView card={c} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "resources" && (
          <ResourceLibrary roomIds={roomIds} title={`${group.name} resources`} />
        )}

        {tab === "courses" && (
          <ChannelEmptyState
            icon={BookOpen}
            title="Courses"
            description="Course channels in this group will list lessons here. Open a course room to teach or learn."
          />
        )}

        {tab === "events" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isStaff && (
              <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2">
                <button
                  type="button"
                  onClick={() => {
                    const title = window.prompt("Event title");
                    if (!title?.trim()) return;
                    const startsAt = new Date(
                      Date.now() + 86400000
                    ).toISOString();
                    addEvent(
                      createEventFromDraft({
                        title: title.trim(),
                        startsAt,
                        communityId,
                        groupId: space.id,
                        createdBy: userId ?? null,
                      })
                    );
                    toast.success("Event created");
                  }}
                  className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
                >
                  + New event
                </button>
              </div>
            )}
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {events.length === 0 ? (
                <ChannelEmptyState
                  icon={Calendar}
                  title="Events"
                  description="Workshops, AMAs, and launches for this group."
                  className="py-8"
                />
              ) : (
                events.map((e) => (
                  <EventCard
                    key={e.id}
                    event={e}
                    userId={userId}
                    canManage={isStaff}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {tab === "members" && (
          <ChannelEmptyState
            icon={Users}
            title="Members"
            description="Group member roster reuses community membership permissions — open the community Members page for the full directory."
          />
        )}

        {tab === "leaderboard" && (
          <ChannelEmptyState
            icon={Trophy}
            title="Leaderboard"
            description="Contribution rankings use the community leaderboard and Community Score — no duplicate XP engine."
          />
        )}

        {tab === "pinned" && (
          <ChannelEmptyState
            icon={Pin}
            title="Pinned"
            description="Pinned messages from channels in this group appear after Discussion warms each channel index."
          />
        )}

        {tab === "activity" && (
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            <p className="text-[13px] text-[var(--color-text-muted)]">
              Recent tasks and events in this group.
            </p>
            {tasks.slice(0, 5).map((t) => (
              <TaskCard key={t.id} task={t} canManage={isStaff} />
            ))}
            {events.slice(0, 3).map((e) => (
              <EventCard key={e.id} event={e} userId={userId} canManage={isStaff} />
            ))}
            {tasks.length === 0 && events.length === 0 && (
              <ChannelEmptyState
                icon={LayoutList}
                title="Activity"
                description="Tasks and events created from collaboration will show up here."
                className="py-8"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
