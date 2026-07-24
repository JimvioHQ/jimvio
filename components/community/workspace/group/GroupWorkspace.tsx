"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  LayoutList,
  Radio,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GROUP_TABS,
  type GroupSidebarId,
  type GroupTabId,
  useCreatorOSStore,
  createEventFromDraft,
  computeCommunityScore,
} from "@/lib/community/os";
import {
  communityRoomHref,
  mapSpaceToGroup,
  roomTypeIcon,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { EventCard, TaskCard } from "@/components/community/os/TaskEventCards";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";
import { CommunityStorefront } from "@/components/community/commerce";
import { CommunityScoreCard } from "@/components/community/os/CommunityScoreCard";
import { WorkspaceTabBar } from "@/components/community/workspace/shared/WorkspaceTabBar";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
import { MembersPanel } from "@/components/community/workspace/channel/panels/MembersPanel";
import { ChannelAiPanel } from "@/components/community/workspace/channel/panels/ChannelAiPanel";
import { GroupHeader } from "./GroupHeader";
import { GroupSidebar } from "./GroupSidebar";

/**
 * Group = Creator Workspace (space).
 * Premium hero + sidebar + value-filled tabs — not a chat clone.
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
  ownerName,
}: {
  space: WorkspaceSpaceRow;
  communityId: string;
  communitySlug: string;
  ownerId: string | null | undefined;
  userId: string | null | undefined;
  membership: MembershipLite | null;
  memberCount?: number;
  isStaff?: boolean;
  ownerName?: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<GroupTabId>("overview");
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const { members } = useCommunityRoster(communityId);

  const group: WorkspaceGroup = useMemo(
    () =>
      mapSpaceToGroup(
        space,
        { userId, ownerId, membership },
        { memberCount: memberCount ?? 0, onlineCount: 0 }
      ),
    [space, userId, ownerId, membership, memberCount]
  );

  const roomIds = useMemo(() => space.rooms.map((r) => r.id), [space.rooms]);
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

  const courseRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "course"),
    [space.rooms]
  );
  const chatRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "chat" || r.room_type === "posts"),
    [space.rooms]
  );

  const score = useMemo(
    () =>
      computeCommunityScore({
        knowledgeCardCount: cards.length,
        answerCount: cards.filter((c) => c.kind === "faq").length,
        taskCompletedCount: tasks.filter((t) => t.status === "completed").length,
        memberCount: members.length || group.memberCount,
        healthScore: Math.min(100, cards.length * 8 + events.length * 10),
      }),
    [cards, tasks, events.length, members.length, group.memberCount]
  );

  const openRoom = useCallback(
    (roomId: string) => {
      router.push(communityRoomHref(communitySlug, space.id, roomId));
    },
    [router, communitySlug, space.id]
  );

  const selectNav = useCallback(
    (id: GroupSidebarId) => {
      if (id === "settings") {
        router.push(
          `/dashboard/communities/${communitySlug}/groups/${space.id}`
        );
        return;
      }
      startTransition(() => setTab(id));
    },
    [router, communitySlug, space.id]
  );

  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return space.rooms;
    return space.rooms.filter((r) => r.name.toLowerCase().includes(q));
  }, [space.rooms, query]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.body ?? "").toLowerCase().includes(q)
    );
  }, [cards, query]);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]",
        "animate-in fade-in duration-300",
        pending && "opacity-95"
      )}
    >
      <GroupSidebar
        active={tab}
        onChange={selectNav}
        showSettings={Boolean(isStaff)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <GroupHeader
          group={group}
          ownerName={ownerName}
          isMember={Boolean(membership)}
          notificationsOn={notificationsOn}
          onToggleNotifications={() => {
            setNotificationsOn((v) => !v);
            toast.success(
              notificationsOn ? "Group notifications muted" : "Notifications on"
            );
          }}
          onSearch={() => {
            const el = document.getElementById("group-workspace-search");
            el?.focus();
            toast.message("Search this workspace", {
              description: "Filter channels, knowledge, and activity below.",
            });
          }}
          onJoin={() =>
            router.push(`/communities/${communitySlug}/subscribe`)
          }
        />

        <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2 sm:px-4 lg:hidden">
          <WorkspaceTabBar
            tabs={GROUP_TABS}
            active={tab}
            onChange={(id) => startTransition(() => setTab(id as GroupTabId))}
            ariaLabel="Group sections"
            idPrefix="group-tab"
            className="border-0 px-0"
          />
        </div>

        <div className="hidden shrink-0 border-b border-[var(--color-border)] px-4 py-2 lg:block">
          <div className="relative max-w-md">
            <input
              id="group-workspace-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search channels, knowledge, activity…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]/40"
              aria-label="Search group workspace"
            />
          </div>
        </div>

        <div
          role="tabpanel"
          aria-labelledby={`group-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200"
        >
          {tab === "overview" && (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              <p className="max-w-2xl text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                Your creator workspace for {group.name} — channels, knowledge,
                courses, events, and live sessions in one place.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Channels" value={group.channels.length} />
                <Stat label="Knowledge" value={cards.length} />
                <Stat label="Events" value={events.length} />
              </div>

              <CommunityScoreCard breakdown={score} compact />

              <section>
                <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  Jump into channels
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {filteredRooms.slice(0, 6).map((r) => {
                    const Icon = roomTypeIcon(r.room_type);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] px-3 py-3 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-secondary)]"
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-[var(--color-text-primary)]">
                            {r.name}
                          </span>
                          <span className="text-[11px] uppercase text-[var(--color-text-muted)]">
                            {r.room_type}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {filteredRooms.length === 0 && (
                    <ChannelEmptyState
                      icon={LayoutList}
                      title="No channels yet"
                      description="Create a channel to start collaborating in this group."
                      className="col-span-full py-8"
                    />
                  )}
                </div>
              </section>

              {tasks.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[12px] font-bold uppercase text-[var(--color-text-muted)]">
                    Open tasks
                  </h3>
                  {tasks.slice(0, 4).map((t) => (
                    <TaskCard key={t.id} task={t} canManage={isStaff} />
                  ))}
                </section>
              )}

              {events.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-[12px] font-bold uppercase text-[var(--color-text-muted)]">
                    Upcoming
                  </h3>
                  {events.slice(0, 3).map((e) => (
                    <EventCard
                      key={e.id}
                      event={e}
                      userId={userId}
                      canManage={isStaff}
                    />
                  ))}
                </section>
              )}
            </div>
          )}

          {tab === "discussion" && (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
              {filteredRooms.length === 0 ? (
                <ChannelEmptyState
                  icon={LayoutList}
                  title="Channels"
                  description="Discussion and announcement channels for this group appear here."
                />
              ) : (
                (query ? filteredRooms : chatRooms.length > 0 ? chatRooms : filteredRooms).map(
                  (r) => {
                    const Icon = roomTypeIcon(r.room_type);
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => openRoom(r.id)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--color-surface-secondary)]"
                        >
                          <Icon className="h-4 w-4 text-[var(--color-accent)]" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-[var(--color-text-primary)]">
                              {r.name}
                            </span>
                            <span className="text-[11px] text-[var(--color-text-muted)]">
                              Open discussion workspace
                            </span>
                          </span>
                          <span className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
                            {r.room_type}
                          </span>
                        </button>
                      </li>
                    );
                  }
                )
              )}
            </ul>
          )}

          {tab === "knowledge" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {filteredCards.length === 0 ? (
                <ChannelEmptyState
                  icon={BookOpen}
                  title="Group knowledge"
                  description="Guides, FAQs, pinned collections, and learning paths converted from channel conversations appear here."
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {filteredCards.map((c) => (
                    <li key={c.id} className="transition hover:scale-[1.01]">
                      <KnowledgeCardView card={c} compact />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "resources" && (
            <ResourceLibrary
              roomIds={roomIds}
              title={`${group.name} resources`}
            />
          )}

          {tab === "courses" && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {courseRooms.length === 0 ? (
                <ChannelEmptyState
                  icon={GraduationCap}
                  title="Courses"
                  description="Course channels in this group list here. Open a course room to teach or continue learning."
                  className="py-10"
                />
              ) : (
                courseRooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => openRoom(r.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-left transition hover:border-[var(--color-accent)]/40"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)]/20 to-[var(--color-surface-secondary)] text-[var(--color-accent)]">
                      <GraduationCap className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-[var(--color-text-primary)]">
                        {r.name}
                      </span>
                      <span className="text-[12px] text-[var(--color-text-muted)]">
                        Course workspace · continue learning
                      </span>
                    </span>
                  </button>
                ))
              )}
              <Link
                href={`/communities/${communitySlug}/courses`}
                className="inline-flex text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
              >
                Browse all community courses →
              </Link>
            </div>
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
                    className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-[12px] font-semibold text-white"
                  >
                    + Schedule event
                  </button>
                </div>
              )}
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {events.length === 0 ? (
                  <ChannelEmptyState
                    icon={Calendar}
                    title="Events"
                    description="Workshops, AMAs, launches, and cohort sessions for this group."
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
            <MembersPanel members={members} />
          )}

          {tab === "live" && (
            <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent)]/10">
                <Radio className="h-7 w-7 text-[var(--color-accent)]" />
              </span>
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Live sessions
              </h2>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                Host workshops, office hours, and co-working sessions with Live
                Studio — tied to this group&apos;s channels and knowledge.
              </p>
              <Link
                href={`/communities/${communitySlug}/live`}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Open Live Studio
              </Link>
            </div>
          )}

          {tab === "store" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <CommunityStorefront
                communityId={communityId}
                base={`/communities/${communitySlug}`}
                communityName={group.name}
              />
            </div>
          )}

          {tab === "activity" && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-[13px] text-[var(--color-text-muted)]">
                Recent tasks, events, and knowledge updates across this group.
              </p>
              {tasks.slice(0, 6).map((t) => (
                <TaskCard key={t.id} task={t} canManage={isStaff} />
              ))}
              {events.slice(0, 4).map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  userId={userId}
                  canManage={isStaff}
                />
              ))}
              {filteredCards.slice(0, 4).map((c) => (
                <KnowledgeCardView key={c.id} card={c} compact />
              ))}
              {tasks.length === 0 &&
                events.length === 0 &&
                cards.length === 0 && (
                  <ChannelEmptyState
                    icon={Sparkles}
                    title="Activity"
                    description="Tasks, events, and knowledge created from collaboration will surface here."
                    className="py-8"
                  />
                )}
            </div>
          )}

          {tab === "ai" && (
            <ChannelAiPanel
              roomId={roomIds[0]}
              communityId={communityId}
              channelName={group.name}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use WorkspaceTabBar — kept for import compatibility */
export function GroupTabs({
  active,
  onChange,
}: {
  active: GroupTabId;
  onChange: (id: GroupTabId) => void;
}) {
  return (
    <WorkspaceTabBar
      tabs={GROUP_TABS}
      active={active}
      onChange={(id) => onChange(id as GroupTabId)}
      ariaLabel="Group sections"
      idPrefix="group-tab"
    />
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)]/50 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
        {label}
      </p>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-[var(--color-text-primary)]">
        {value}
      </p>
    </div>
  );
}
