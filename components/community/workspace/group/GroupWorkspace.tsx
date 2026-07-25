"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutList,
  Megaphone,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  GROUP_TABS,
  type GroupSidebarId,
  type GroupTabId,
} from "@/lib/community/os";
import {
  communityChannelHref,
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
import { OpportunityMarketplace } from "@/components/community/economy";
import { WorkspaceTabBar } from "@/components/community/workspace/shared/WorkspaceTabBar";
import { useCommunityRoster } from "@/components/community/workspace/shared/useCommunityRoster";
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
  const announcementRooms = useMemo(
    () =>
      space.rooms.filter(
        (r) =>
          r.room_type === "posts" ||
          (r.channel_kind ?? "").toLowerCase() === "announcement" ||
          /announcement/i.test(r.name)
      ),
    [space.rooms]
  );
  const marketplaceRooms = useMemo(
    () =>
      space.rooms.filter(
        (r) =>
          (r.channel_kind ?? "").toLowerCase() === "marketplace" ||
          /marketplace|store/i.test(r.name)
      ),
    [space.rooms]
  );
  const campaignRooms = useMemo(
    () =>
      space.rooms.filter(
        (r) =>
          (r.channel_kind ?? "").toLowerCase() === "campaigns" ||
          /campaign/i.test(r.name)
      ),
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
                  conversationSurface="space"
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

          {tab === "announcements" && (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {announcementRooms.length === 0 ? (
                <ChannelEmptyState
                  icon={Megaphone}
                  title="No announcements yet"
                  description="Announcements are broadcast Channels — only owners, admins, and moderators publish. Members can read, react, and comment when enabled."
                  className="py-10"
                  actionLabel={isStaff ? "Create Channel" : "Back to Discussion"}
                  onAction={() =>
                    isStaff
                      ? setCreateChannelOpen(true)
                      : startTransition(() => setTab("discussion"))
                  }
                />
              ) : (
                announcementRooms.map((r) => {
                  const channel = mapRoomToChannel(r, roleInput);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          communityChannelHref(communitySlug, r.slug)
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-left transition hover:border-[var(--color-accent)]/40"
                    >
                      <Megaphone className="h-5 w-5 text-[var(--color-accent)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-[var(--color-text-primary)]">
                          {channel.name}
                        </span>
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          Broadcast channel
                        </span>
                      </span>
                      <LayoutList className="h-4 w-4 text-[var(--color-text-muted)]" />
                    </button>
                  );
                })
              )}
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {resourceRooms.length > 0 ? (
                <div className="shrink-0 space-y-2 border-b border-[var(--color-border)] p-3">
                  {resourceRooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          communityChannelHref(communitySlug, r.slug)
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-left text-[13px] font-semibold text-[var(--color-text-primary)] hover:border-[var(--color-accent)]/40"
                    >
                      <BookOpen className="h-4 w-4 text-[var(--color-accent)]" />
                      {r.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <ResourceLibrary
                roomIds={roomIds}
                title={`${group.name} resources`}
              />
            </div>
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

          {tab === "marketplace" && (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {marketplaceRooms.length > 0 ? (
                <div className="mb-4 space-y-2">
                  {marketplaceRooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          communityChannelHref(communitySlug, r.slug)
                        )
                      }
                      className="flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-left text-[13px] font-semibold hover:border-[var(--color-accent)]/40"
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              ) : null}
              <CommunityStorefront
                communityId={communityId}
                base={`/communities/${communitySlug}`}
                communityName={group.name}
              />
            </div>
          )}

          {tab === "campaigns" && (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {campaignRooms.length > 0 ? (
                <div className="space-y-2">
                  {campaignRooms.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        router.push(
                          communityChannelHref(communitySlug, r.slug)
                        )
                      }
                      className="flex w-full items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3.5 text-left transition hover:border-[var(--color-accent)]/40"
                    >
                      <Target className="h-5 w-5 text-[var(--color-accent)]" />
                      <span className="text-sm font-bold text-[var(--color-text-primary)]">
                        {r.name}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <ChannelEmptyState
                  icon={Target}
                  title="No campaigns yet"
                  description="Campaign Channels are broadcast spaces for launches and brand work. Publishers post; members follow along."
                  className="py-8"
                  actionLabel={isStaff ? "Create Channel" : "Back to Discussion"}
                  onAction={() =>
                    isStaff
                      ? setCreateChannelOpen(true)
                      : startTransition(() => setTab("discussion"))
                  }
                />
              )}
              <OpportunityMarketplace opportunities={[]} />
            </div>
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
