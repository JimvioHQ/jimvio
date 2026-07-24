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
} from "@/lib/community/os";
import {
  communityRoomHref,
  mapSpaceToGroup,
  mapRoomToChannel,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { EventCard, TaskCard } from "@/components/community/os/TaskEventCards";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";
import { ChannelCard } from "@/components/community/workspace/channel/ChannelCard";
import { CommunityStorefront } from "@/components/community/commerce";
import { WorkspaceTabBar } from "@/components/community/workspace/shared/WorkspaceTabBar";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
import { useWorkspaceFavorites } from "@/components/community/workspace/shared/useWorkspaceFavorites";
import { MembersPanel } from "@/components/community/workspace/channel/panels/MembersPanel";
import { ChannelAiPanel } from "@/components/community/workspace/channel/panels/ChannelAiPanel";
import { GroupHeader } from "./GroupHeader";
import { GroupSidebar } from "./GroupSidebar";

/**
 * Group = Creator Workspace (space).
 * Overview first — discussion begins only inside a Channel.
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
  const { isFavorite, toggleFavorite } = useWorkspaceFavorites();
  const [mutedChannels, setMutedChannels] = useState<Record<string, true>>({});

  const roleInput = useMemo(
    () => ({ userId, ownerId, membership }),
    [userId, ownerId, membership]
  );

  const group: WorkspaceGroup = useMemo(
    () =>
      mapSpaceToGroup(space, roleInput, {
        memberCount: memberCount ?? members.length,
        onlineCount: 0,
        description: null,
      }),
    [space, roleInput, memberCount, members.length]
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
  const resourceRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "resources"),
    [space.rooms]
  );
  const announcementRooms = useMemo(
    () =>
      space.rooms.filter(
        (r) => r.room_type === "posts" || /announcement|welcome/i.test(r.name)
      ),
    [space.rooms]
  );
  const liveRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "live" || r.room_type === "voice"),
    [space.rooms]
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

  const channelCards = useMemo(
    () =>
      filteredRooms.map((r) => ({
        room: r,
        channel: mapRoomToChannel(r, roleInput),
      })),
    [filteredRooms, roleInput]
  );

  const purpose =
    group.description?.trim() ||
    `A focused collaboration space for ${group.name}. Explore channels, resources, and live sessions — then open a channel to discuss.`;

  const pinnedAnnouncement = announcementRooms[0] ?? null;

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
          searchValue={query}
          onSearchChange={setQuery}
          onSearch={() => {
            const el =
              document.getElementById("group-workspace-search") ||
              document.getElementById("group-workspace-search-mobile");
            el?.focus();
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
              placeholder="Search channels, knowledge…"
              className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]/40 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-label="Search group workspace"
            />
          </div>
        </div>

        <div
          role="tabpanel"
          id={`group-tab-${tab}-panel`}
          aria-labelledby={`group-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200"
        >
          {tab === "overview" && (
            <div className="min-h-0 flex-1 space-y-10 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
              <section className="max-w-2xl space-y-2">
                <h2 className="text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                  Group overview
                </h2>
                <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                  {purpose}
                </p>
              </section>

              <section className="max-w-2xl space-y-2">
                <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                  Purpose
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                  Learn together, share resources, and ship work in dedicated
                  channels — chat starts only after you enter a channel.
                </p>
              </section>

              {pinnedAnnouncement && (
                <section className="max-w-2xl space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Pinned announcement
                  </h3>
                  <button
                    type="button"
                    onClick={() => openRoom(pinnedAnnouncement.id)}
                    className="w-full rounded-2xl bg-[var(--color-surface-secondary)]/70 px-5 py-4 text-left transition hover:bg-[var(--color-surface-secondary)]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      Announcement
                    </p>
                    <p className="mt-1 text-[15px] font-semibold text-[var(--color-text-primary)]">
                      {pinnedAnnouncement.name}
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                      Open channel overview
                    </p>
                  </button>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Featured channels
                  </h3>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setTab("discussion"))}
                    className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                  >
                    All channels
                  </button>
                </div>
                {channelCards.length === 0 ? (
                  <ChannelEmptyState
                    icon={LayoutList}
                    title="No channels yet"
                    description="Create the first channel to start collaborating in this group."
                    className="py-8"
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {channelCards.slice(0, 4).map(({ room, channel }) => (
                      <ChannelCard
                        key={room.id}
                        channel={channel}
                        href={communityRoomHref(communitySlug, space.id, room.id)}
                        isFavorite={isFavorite("channel", room.id)}
                        notificationsOn={!mutedChannels[room.id]}
                        onToggleFavorite={() => {
                          toggleFavorite("channel", room.id);
                          toast.success("Favorites updated");
                        }}
                        onToggleNotifications={() => {
                          setMutedChannels((prev) => {
                            const next = { ...prev };
                            if (next[room.id]) delete next[room.id];
                            else next[room.id] = true;
                            return next;
                          });
                          toast.success(
                            mutedChannels[room.id]
                              ? "Notifications on"
                              : "Channel muted"
                          );
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {resourceRooms.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Resources
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {resourceRooms.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="rounded-xl px-4 py-3 text-left transition hover:bg-[var(--color-surface-secondary)]/70"
                      >
                        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                          {r.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--color-text-muted)]">
                          Shared files & links
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {members.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      Members preview
                    </h3>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setTab("members"))}
                      className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-48 overflow-hidden">
                    <MembersPanel members={members.slice(0, 8)} />
                  </div>
                </section>
              )}

              {events.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Upcoming events
                  </h3>
                  <div className="space-y-2">
                    {events.slice(0, 3).map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        userId={userId}
                        canManage={isStaff}
                      />
                    ))}
                  </div>
                </section>
              )}

              {courseRooms.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Courses
                  </h3>
                  <div className="space-y-2">
                    {courseRooms.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--color-surface-secondary)]/70"
                      >
                        <GraduationCap className="h-4 w-4 text-[var(--color-accent)]" />
                        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                          {r.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {liveRooms.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Live session
                  </h3>
                  <div className="space-y-2">
                    {liveRooms.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="flex w-full items-center gap-3 rounded-xl bg-zinc-950 px-4 py-3.5 text-left text-white transition hover:opacity-95"
                      >
                        <Radio className="h-4 w-4 text-red-400" />
                        <span>
                          <span className="block text-[14px] font-semibold">
                            {r.name}
                          </span>
                          <span className="text-[12px] text-white/60">
                            Open live / voice channel
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                    Shared files & recent knowledge
                  </h3>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setTab("knowledge"))}
                    className="text-[12px] font-medium text-[var(--color-accent)] hover:underline"
                  >
                    Knowledge
                  </button>
                </div>
                {filteredCards.length === 0 && tasks.length === 0 ? (
                  <div className="rounded-2xl bg-[var(--color-surface-secondary)]/60 px-4 py-5">
                    <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                      No resources yet
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                      Upload your first resource or convert a discussion into
                      lasting knowledge.
                    </p>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setTab("resources"))}
                      className="mt-3 text-[13px] font-semibold text-[var(--color-accent)] hover:underline"
                    >
                      Open resources
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredCards.slice(0, 4).map((c) => (
                      <KnowledgeCardView key={c.id} card={c} compact />
                    ))}
                    {tasks.slice(0, 2).map((t) => (
                      <TaskCard key={t.id} task={t} canManage={isStaff} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {tab === "discussion" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div>
                <h2 className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                  Channels
                </h2>
                <p className="mt-1 text-[13px] text-[var(--color-text-muted)]">
                  Pick a channel to open its overview — discussion begins there.
                </p>
              </div>
              {channelCards.length === 0 ? (
                <ChannelEmptyState
                  icon={LayoutList}
                  title="No channels yet"
                  description="Create the first channel to start collaborating in this group."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {channelCards.map(({ room, channel }) => (
                    <ChannelCard
                      key={room.id}
                      channel={channel}
                      href={communityRoomHref(communitySlug, space.id, room.id)}
                      isFavorite={isFavorite("channel", room.id)}
                      notificationsOn={!mutedChannels[room.id]}
                      onToggleFavorite={() => toggleFavorite("channel", room.id)}
                      onToggleNotifications={() => {
                        setMutedChannels((prev) => {
                          const next = { ...prev };
                          if (next[room.id]) delete next[room.id];
                          else next[room.id] = true;
                          return next;
                        });
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "knowledge" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {filteredCards.length === 0 ? (
                <ChannelEmptyState
                  icon={BookOpen}
                  title="No knowledge yet"
                  description="Guides, FAQs, and learning paths converted from channel conversations appear here."
                  actionLabel={
                    space.rooms[0] ? "Browse channels" : undefined
                  }
                  onAction={
                    space.rooms[0]
                      ? () => startTransition(() => setTab("discussion"))
                      : undefined
                  }
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
                  title="No courses yet"
                  description="Course channels in this group list here. Open a course room to teach or continue learning."
                  className="py-10"
                  actionLabel="Browse community courses"
                  onAction={() =>
                    router.push(`/communities/${communitySlug}/courses`)
                  }
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
                    title="No events yet"
                    description="Schedule your first event — workshops, AMAs, launches, and cohort sessions."
                    className="py-8"
                    actionLabel={isStaff ? "Schedule the first event" : undefined}
                    onAction={
                      isStaff
                        ? () => {
                            const title = window.prompt("Event title");
                            if (!title?.trim()) return;
                            addEvent(
                              createEventFromDraft({
                                title: title.trim(),
                                startsAt: new Date(
                                  Date.now() + 86400000
                                ).toISOString(),
                                communityId,
                                groupId: space.id,
                                createdBy: userId ?? null,
                              })
                            );
                            toast.success("Event created");
                          }
                        : undefined
                    }
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

          {tab === "members" && <MembersPanel members={members} />}

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
                    title="Quiet for now"
                    description="Tasks, events, and knowledge created from collaboration will surface here."
                    className="py-8"
                    actionLabel="Browse channels"
                    onAction={() =>
                      startTransition(() => setTab("discussion"))
                    }
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
