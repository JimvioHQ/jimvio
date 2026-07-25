"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
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
} from "@/lib/community/os";
import {
  communityRoomHref,
  canEnterGroup,
  mapSpaceToGroup,
  mapRoomToChannel,
  resolveGroupDiscussionRoom,
  type WorkspaceGroup,
} from "@/lib/community/workspace";
import type { WorkspaceSpaceRow } from "@/components/community/workspace-context";
import type { MembershipLite } from "@/lib/community-workspace-access";
import { ResourceLibrary } from "@/components/community/os/ResourceLibrary";
import { KnowledgeCardView } from "@/components/community/knowledge/KnowledgeCardView";
import { useCollaborationStore } from "@/lib/community/knowledge";
import { ChannelEmptyState } from "@/components/community/workspace/channel/ChannelEmptyState";
import { CommunityStorefront } from "@/components/community/commerce";
import { WorkspaceTabBar } from "@/components/community/workspace/shared/WorkspaceTabBar";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
import { ChannelAiPanel } from "@/components/community/workspace/channel/panels/ChannelAiPanel";
import { ChatRoom } from "@/components/community/chat/ChatRoom";
import { WorkspaceSkeleton } from "@/components/community/workspace/shared/WorkspaceSkeleton";
import { CreateChannelDialog } from "@/components/community/CreateChannelDialog";
import { GroupHeader } from "./GroupHeader";
import { GroupSidebar } from "./GroupSidebar";
import { useNotificationMute } from "@/components/community/workspace/shared/useNotificationMute";

type DiscussionRoom = WorkspaceSpaceRow["rooms"][number];

/**
 * Group = live conversation (Telegram/WhatsApp style).
 * Opening a Group always lands on Discussion (ChatRoom) — Overview is secondary.
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
  const [tab, setTab] = useState<GroupTabId>("discussion");
  const [joiningGroup, setJoiningGroup] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const { members } = useCommunityRoster(communityId);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [ensuredRoom, setEnsuredRoom] = useState<DiscussionRoom | null>(null);
  const [ensuring, setEnsuring] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureAttempt, setEnsureAttempt] = useState(0);
  const [localSpaceAccess, setLocalSpaceAccess] = useState<string[] | null>(
    membership?.space_access ?? null
  );
  const { notificationsOn, toggle: toggleGroupMute } = useNotificationMute({
    communityId,
    kind: "space",
    targetId: space.id,
  });

  useEffect(() => {
    setLocalSpaceAccess(membership?.space_access ?? null);
  }, [membership?.space_access]);

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
  const allCards = useCollaborationStore((s) => s.cards);
  const cards = useMemo(
    () => allCards.filter((c) => roomIds.includes(c.roomId)),
    [allCards, roomIds]
  );

  const courseRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "course"),
    [space.rooms]
  );
  const resourceRooms = useMemo(
    () => space.rooms.filter((r) => r.room_type === "resources"),
    [space.rooms]
  );

  const resolvedFromSpace = useMemo(
    () => resolveGroupDiscussionRoom(space.rooms),
    [space.rooms]
  );
  const discussionRoom = resolvedFromSpace ?? ensuredRoom;

  const canPost =
    Boolean(userId) &&
    Boolean(membership?.status === "active" || isStaff) &&
    membership?.status !== "cancelled";

  useEffect(() => {
    if (resolvedFromSpace || ensuredRoom) return;
    let cancelled = false;
    setEnsuring(true);
    setEnsureError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/rooms/${space.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ensure_discussion: true }),
        });
        const data = (await res.json()) as {
          room?: DiscussionRoom;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.room) {
          setEnsureError(data.error ?? "Could not open Discussion");
          return;
        }
        setEnsuredRoom(data.room);
        router.refresh();
      } catch {
        if (!cancelled) setEnsureError("Could not open Discussion");
      } finally {
        if (!cancelled) setEnsuring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedFromSpace, ensuredRoom, space.id, ensureAttempt, router]);

  const openRoom = useCallback(
    (roomSlug: string) => {
      router.push(communityRoomHref(communitySlug, space.slug, roomSlug));
    },
    [router, communitySlug, space.slug]
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

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.body ?? "").toLowerCase().includes(q)
    );
  }, [cards, query]);

  const purpose =
    group.description?.trim() ||
    `Welcome to ${group.name}. This is where the group collaborates in real time.`;

  const otherChannels = useMemo(
    () =>
      space.rooms.filter(
        (r) => !discussionRoom || r.id !== discussionRoom.id
      ),
    [space.rooms, discussionRoom]
  );

  const isEmptyGroup = space.rooms.length === 0 && !discussionRoom;

  const membershipWithAccess = useMemo<MembershipLite | null>(() => {
    if (!membership) return null;
    return { ...membership, space_access: localSpaceAccess };
  }, [membership, localSpaceAccess]);

  const isGroupMember = useMemo(() => {
    if (!membershipWithAccess || membershipWithAccess.status !== "active") {
      return false;
    }
    return canEnterGroup({
      spaceAccessType: space.access_type,
      membership: membershipWithAccess,
      ownerId: ownerId ?? undefined,
      userId: userId ?? undefined,
      spaceId: space.id,
    });
  }, [membershipWithAccess, space.access_type, space.id, ownerId, userId]);

  async function handleJoinGroup() {
    if (!membership) {
      router.push(`/communities/${communitySlug}`);
      return;
    }
    setJoiningGroup(true);
    try {
      const res = await fetch(`/api/c/spaces/${space.id}/join`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        spaceAccess?: string[];
        alreadyJoined?: boolean;
      };
      if (!res.ok) {
        if (data.code === "community_membership_required") {
          router.push(`/communities/${communitySlug}`);
          return;
        }
        throw new Error(data.error || "Couldn't join group");
      }
      if (Array.isArray(data.spaceAccess)) {
        setLocalSpaceAccess(data.spaceAccess);
      } else if (!data.alreadyJoined) {
        setLocalSpaceAccess((prev) =>
          prev && prev.length > 0
            ? prev.includes(space.id)
              ? prev
              : [...prev, space.id]
            : [space.id]
        );
      }
      toast.success(data.alreadyJoined ? "You're already in this group" : "Joined group");
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Couldn't join group");
    } finally {
      setJoiningGroup(false);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-1 overflow-hidden bg-[var(--color-surface)]",
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
          isMember={isGroupMember}
          notificationsOn={notificationsOn}
          communityId={communityId}
          bookmarkHref={`/communities/${communitySlug}/groups/${group.slug}`}
          compact={tab === "discussion"}
          onToggleNotifications={() => {
            void toggleGroupMute();
          }}
          searchValue={query}
          onSearchChange={setQuery}
          onSearch={() => {
            const el =
              document.getElementById("group-workspace-search") ||
              document.getElementById("group-workspace-search-mobile");
            el?.focus();
          }}
          onJoin={() => {
            if (joiningGroup) return;
            void handleJoinGroup();
          }}
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

        <div
          role="tabpanel"
          id={`group-tab-${tab}-panel`}
          aria-labelledby={`group-tab-${tab}`}
          className="flex min-h-0 flex-1 flex-col overflow-hidden transition-opacity duration-200"
        >
          {/* Discussion — always mounted when active; ChatRoom is the source of truth */}
          {tab === "discussion" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {discussionRoom ? (
                <ChatRoom
                  roomId={discussionRoom.id}
                  roomName={discussionRoom.name}
                  communityId={communityId}
                  slug={communitySlug}
                  hideHeader
                  canPost={canPost}
                  emptyTitle={`Welcome to ${group.name}.`}
                  emptyDescription={
                    isEmptyGroup || otherChannels.length === 0
                      ? "Start the first conversation.\nOr create your first Channel."
                      : "Start the conversation — messages, replies, reactions, and files live here."
                  }
                  emptyActionLabel="Write a message"
                />
              ) : ensuring ? (
                <WorkspaceSkeleton rows={8} className="min-h-[320px]" />
              ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
                  <p className="text-[16px] font-semibold text-[var(--color-text-primary)]">
                    Welcome to {group.name}.
                  </p>
                  <p className="max-w-sm text-[13px] leading-relaxed text-[var(--color-text-muted)]">
                    Start the first conversation.
                    <br />
                    Or create your first Channel.
                  </p>
                  {ensureError ? (
                    <p className="text-[12px] text-[var(--color-danger,#b91c1c)]">
                      {ensureError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEnsuredRoom(null);
                        setEnsureError(null);
                        setEnsureAttempt((n) => n + 1);
                      }}
                      className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white"
                    >
                      Retry Discussion
                    </button>
                    {isStaff ? (
                      <button
                        type="button"
                        onClick={() => setCreateChannelOpen(true)}
                        className="inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border)] px-4 text-[13px] font-semibold text-[var(--color-text-primary)]"
                      >
                        Create Channel
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              {isStaff && discussionRoom ? (
                <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => setCreateChannelOpen(true)}
                    className="text-[11px] font-semibold text-[var(--color-accent)] hover:underline"
                  >
                    + Create Channel
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {tab === "overview" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-[880px] space-y-10 px-4 py-8 sm:px-6 sm:py-10">
                <section className="grid gap-4 sm:grid-cols-2">
                  <article className="rounded-2xl bg-[var(--color-bg)]/60 p-6 ring-1 ring-[var(--color-border)]/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                      About
                    </p>
                    <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                      Welcome to {group.name}
                    </h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                      {purpose}
                    </p>
                  </article>
                  <article className="rounded-2xl bg-[var(--color-bg)]/60 p-6 ring-1 ring-[var(--color-border)]/60">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
                      Mission
                    </p>
                    <h2 className="mt-2 text-[18px] font-semibold tracking-tight text-[var(--color-text-primary)]">
                      How we collaborate
                    </h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                      Discussion is the home of this group. Specialized channels
                      handle resources, courses, and live work — jump back here
                      anytime to keep talking.
                    </p>
                  </article>
                </section>

                {group.rules ? (
                  <section>
                    <h3 className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
                      Rules
                    </h3>
                    <div className="rounded-2xl bg-[var(--color-bg)]/60 p-5 ring-1 ring-[var(--color-border)]/60">
                      <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
                        {group.rules}
                      </p>
                    </div>
                  </section>
                ) : null}

                <section>
                  <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
                      Featured resources
                    </h3>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setTab("resources"))}
                      className="min-h-10 text-[12px] font-semibold text-[var(--color-accent)] hover:underline"
                    >
                      All resources
                    </button>
                  </div>
                  {resourceRooms.length === 0 && filteredCards.length === 0 ? (
                    <ChannelEmptyState
                      icon={BookOpen}
                      title="No resources yet"
                      description="Upload guides and links from the Resources tab."
                      className="rounded-2xl bg-[var(--color-bg)]/50 py-8 ring-1 ring-[var(--color-border)]/50"
                    />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {resourceRooms.slice(0, 4).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => openRoom(r.slug)}
                          className="flex min-h-[80px] items-start gap-3 rounded-2xl bg-[var(--color-bg)]/60 px-4 py-4 text-left ring-1 ring-[var(--color-border)]/60 transition hover:ring-[var(--color-accent)]/30"
                        >
                          <BookOpen className="mt-0.5 h-4 w-4 text-[var(--color-accent)]" />
                          <span>
                            <span className="block text-[14px] font-semibold text-[var(--color-text-primary)]">
                              {r.name}
                            </span>
                            <span className="text-[12px] text-[var(--color-text-muted)]">
                              Resource channel
                            </span>
                          </span>
                        </button>
                      ))}
                      {filteredCards.slice(0, 4).map((c) => (
                        <KnowledgeCardView key={c.id} card={c} compact />
                      ))}
                    </div>
                  )}
                </section>

                {otherChannels.length > 0 ? (
                  <section>
                    <h3 className="mb-3 text-[13px] font-semibold text-[var(--color-text-primary)]">
                      Channels
                    </h3>
                    <ul className="space-y-2">
                      {otherChannels.map((r) => {
                        const channel = mapRoomToChannel(r, roleInput);
                        return (
                          <li key={r.id}>
                            <Link
                              href={communityRoomHref(
                                communitySlug,
                                space.slug,
                                r.slug
                              )}
                              className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-[13px] font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-accent)]/40"
                            >
                              <LayoutList className="h-4 w-4 text-[var(--color-text-muted)]" />
                              {channel.name}
                              <span className="ml-auto text-[10px] uppercase text-[var(--color-text-muted)]">
                                {channel.type}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ) : null}

                <button
                  type="button"
                  onClick={() => startTransition(() => setTab("discussion"))}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Back to Discussion
                </button>
              </div>
            </div>
          )}

          {tab === "knowledge" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {filteredCards.length === 0 ? (
                <ChannelEmptyState
                  icon={BookOpen}
                  title="No knowledge yet"
                  description="Guides and FAQs converted from Discussion appear here."
                  actionLabel="Open Discussion"
                  onAction={() =>
                    startTransition(() => setTab("discussion"))
                  }
                />
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {filteredCards.map((c) => (
                    <li key={c.id}>
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
                  description="Course channels in this group list here."
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
                    onClick={() => openRoom(r.slug)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-left transition hover:border-[var(--color-accent)]/40"
                  >
                    <GraduationCap className="h-5 w-5 text-[var(--color-accent)]" />
                    <span className="text-sm font-bold text-[var(--color-text-primary)]">
                      {r.name}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {tab === "live" && (
            <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 text-center">
              <Radio className="mb-4 h-7 w-7 text-[var(--color-accent)]" />
              <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                Live sessions
              </h2>
              <p className="mt-2 text-[13px] text-[var(--color-text-muted)]">
                Host workshops and office hours with Live Studio. Discussion stays
                open before, during, and after.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href={`/communities/${communitySlug}/live`}
                  className="inline-flex rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Open Live Studio
                </Link>
                {discussionRoom && (
                  <button
                    type="button"
                    onClick={() => startTransition(() => setTab("discussion"))}
                    className="inline-flex rounded-lg border border-[var(--color-border)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]"
                  >
                    Open Discussion
                  </button>
                )}
              </div>
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

          {tab === "ai" && (
            <ChannelAiPanel
              roomId={discussionRoom?.id ?? roomIds[0]}
              communityId={communityId}
              channelName={group.name}
            />
          )}
        </div>
      </div>

      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        spaceId={space.id}
        onCreated={() => router.refresh()}
      />
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
