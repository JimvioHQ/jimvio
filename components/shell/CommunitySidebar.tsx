"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
  Megaphone,
  Plus,
  Settings,
  Target,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";
import {
  useWorkspaceOptional,
  type WorkspaceRoomRow,
  type WorkspaceSpaceRow,
} from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { CreateChannelDialog } from "@/components/community/CreateChannelDialog";

type CommunityNavItem =
  | "overview"
  | "announcements"
  | "events"
  | "courses"
  | "challenges"
  | "about";

type NavLink = {
  id: CommunityNavItem;
  label: string;
  icon: typeof LayoutGrid;
  href: string;
};

type GroupItem = {
  id: string;
  label: string;
  href: string;
  unread?: number;
  live?: boolean;
};

type ChannelItem = {
  id: string;
  label: string;
  emoji: string;
  href: string;
  roomId?: string;
  spaceId?: string;
};

type CommunitySidebarProps = {
  slug: string;
  communityName?: string;
  visibility?: string;
  membersOnline?: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces?: GroupItem[];
  /** Mobile drawer mode (rendered from HubLayout). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

/** Spaces that hold community-wide channels (not member Groups). */
const SYSTEM_SPACE_SLUGS = new Set([
  "general",
  "announcements",
  "resources",
  "channels",
]);

const DEFAULT_CHANNEL_DEFS: {
  key: string;
  label: string;
  emoji: string;
  roomTypes: string[];
  nameMatch: RegExp;
  fallbackHref: string;
}[] = [
  {
    key: "general",
    label: "General",
    emoji: "💬",
    roomTypes: ["chat"],
    nameMatch: /^general(\s|chat|$)/i,
    fallbackHref: "/chat",
  },
  {
    key: "signals",
    label: "Signals",
    emoji: "📈",
    roomTypes: ["chat"],
    nameMatch: /signal/i,
    fallbackHref: "/chat",
  },
  {
    key: "resources",
    label: "Resources",
    emoji: "📚",
    roomTypes: ["resources"],
    nameMatch: /resource/i,
    fallbackHref: "/chat",
  },
  {
    key: "voice",
    label: "Voice Room",
    emoji: "🎤",
    roomTypes: ["voice", "live"],
    nameMatch: /voice/i,
    fallbackHref: "/live",
  },
];

const NAV_ITEMS: NavLink[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "" },
  { id: "announcements", label: "Announcements", icon: Megaphone, href: "/chat" },
  { id: "events", label: "Events", icon: Calendar, href: "/live" },
  { id: "courses", label: "Courses", icon: BookOpen, href: "/courses" },
  { id: "challenges", label: "Challenges", icon: Target, href: "/missions" },
  { id: "about", label: "About", icon: Info, href: "/about" },
];

function formatMemberCount(count: number): string {
  if (count >= 1_000_000) {
    const n = count / 1_000_000;
    return `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (count >= 10_000) {
    return `${Math.round(count / 1000)}K`;
  }
  if (count >= 1000) {
    const n = count / 1000;
    return `${n.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return count.toLocaleString();
}

function roomHref(spaceId: string, roomId: string) {
  return `/room?space=${spaceId}&room=${roomId}`;
}

function channelEmoji(room: WorkspaceRoomRow): string {
  if (room.room_type === "posts" || /announcement/i.test(room.name)) return "📢";
  if (room.room_type === "resources" || /resource/i.test(room.name)) return "📚";
  if (room.room_type === "voice" || /voice/i.test(room.name)) return "🎤";
  if (/signal/i.test(room.name)) return "📈";
  return "💬";
}

function buildChannels(spacesWithRooms: WorkspaceSpaceRow[]): ChannelItem[] {
  type FlatRoom = WorkspaceRoomRow & { spaceId: string };
  const allRooms: FlatRoom[] = spacesWithRooms.flatMap((s) =>
    s.rooms.map((r) => ({ ...r, spaceId: s.id }))
  );
  const used = new Set<string>();
  const channels: ChannelItem[] = [];

  for (const def of DEFAULT_CHANNEL_DEFS) {
    const byName = allRooms.find(
      (r) => !used.has(r.id) && def.nameMatch.test(r.name)
    );
    const byType = allRooms.find(
      (r) => !used.has(r.id) && def.roomTypes.includes(r.room_type)
    );
    // Signals / Voice: name-only so we don't steal unrelated chat rooms
    const match =
      def.key === "signals" || def.key === "voice"
        ? byName
        : byName ?? byType;

    if (match) {
      used.add(match.id);
      channels.push({
        id: match.id,
        label: def.label,
        emoji: def.emoji,
        href: roomHref(match.spaceId, match.id),
        roomId: match.id,
        spaceId: match.spaceId,
      });
    } else {
      channels.push({
        id: `default-${def.key}`,
        label: def.label,
        emoji: def.emoji,
        href: def.fallbackHref,
      });
    }
  }

  for (const room of allRooms) {
    if (used.has(room.id)) continue;
    // Announcements stay in top-level nav, not under Channels
    if (room.room_type === "posts" || /announcement/i.test(room.name)) continue;
    channels.push({
      id: room.id,
      label: room.name,
      emoji: channelEmoji(room),
      href: roomHref(room.spaceId, room.id),
      roomId: room.id,
      spaceId: room.spaceId,
    });
  }

  return channels;
}

function buildGroups(spacesWithRooms: WorkspaceSpaceRow[]): GroupItem[] {
  return spacesWithRooms
    .filter((space) => !SYSTEM_SPACE_SLUGS.has(space.slug))
    .map((space) => {
      const firstRoom = space.rooms[0];
      const href = firstRoom
        ? roomHref(space.id, firstRoom.id)
        : `/chat?space=${encodeURIComponent(space.slug)}`;
      return { id: space.id, label: space.name, href };
    });
}

function resolveChannelsHomeSpaceId(spacesWithRooms: WorkspaceSpaceRow[]): string | null {
  const channelsSpace = spacesWithRooms.find((s) => s.slug === "channels");
  if (channelsSpace) return channelsSpace.id;
  const general = spacesWithRooms.find((s) => s.slug === "general");
  if (general) return general.id;
  return spacesWithRooms[0]?.id ?? null;
}

function resolveAnnouncementsHref(
  spacesWithRooms: WorkspaceSpaceRow[],
  base: string
): string {
  for (const space of spacesWithRooms) {
    const room = space.rooms.find(
      (r) => r.room_type === "posts" || /announcement/i.test(r.name)
    );
    if (room) return `${base}${roomHref(space.id, room.id)}`;
  }
  return `${base}/chat`;
}

function SidebarBody({
  slug,
  communityName,
  visibility,
  memberCount,
  activeNav,
  activeSpaceId,
  groups,
  channels,
  spacesWithRooms,
  canManage,
  communityId,
  channelsHomeSpaceId,
  onNavigate,
}: {
  slug: string;
  communityName: string;
  visibility: string;
  memberCount: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  groups: GroupItem[];
  channels: ChannelItem[];
  spacesWithRooms: WorkspaceSpaceRow[];
  canManage: boolean;
  communityId: string | null;
  channelsHomeSpaceId: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const base = `/communities/${slug}`;
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  const announcementsHref = resolveAnnouncementsHref(spacesWithRooms, base);

  function navActive(id: CommunityNavItem, href: string) {
    if (activeNav) return activeNav === id;
    if (id === "announcements") {
      for (const space of spacesWithRooms) {
        const room = space.rooms.find(
          (r) => r.room_type === "posts" || /announcement/i.test(r.name)
        );
        if (room && searchParams.get("room") === room.id) return true;
      }
      return pathname.startsWith(`${base}/chat`);
    }
    if (id === "about") {
      return pathname === `${base}/about` || pathname.startsWith(`${base}/about/`);
    }
    const full = href ? `${base}${href.split("?")[0]}` : base;
    if (!href) {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  function groupActive(group: GroupItem) {
    if (activeSpaceId) return activeSpaceId === group.id;
    if (pathname.includes("/room") || pathname.includes("/chat")) {
      const spaceQuery = group.href.includes("space=")
        ? group.href.split("space=")[1]?.split("&")[0]
        : null;
      const currentSpace = searchParams.get("space");
      if (spaceQuery && currentSpace) return currentSpace === spaceQuery;
    }
    return false;
  }

  function channelActive(channel: ChannelItem) {
    if (!channel.roomId) {
      if (channel.href === "/chat") return pathname.startsWith(`${base}/chat`);
      if (channel.href === "/live") return pathname.startsWith(`${base}/live`);
      return false;
    }
    return searchParams.get("room") === channel.roomId;
  }

  return (
    <>
      <div className="border-b border-gray-100 px-4 pb-4 pt-3">
        <Link
          href="/communities"
          onClick={onNavigate}
          className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-700"
        >
          <ArrowLeft className="h-3 w-3" />
          All communities
        </Link>

        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-bold text-orange-600">
            {communityName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-[15px] font-semibold tracking-tight text-gray-900">
                {communityName}
              </p>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-blue-500"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[12px] text-gray-500">{visibility}</p>
            <p className="text-[12px] text-gray-400">
              {formatMemberCount(memberCount)}{" "}
              {memberCount === 1 ? "Member" : "Members"}
            </p>
          </div>
          {canManage && (
            <Link
              href={`${base}/members`}
              onClick={onNavigate}
              aria-label="Community settings"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        <Link
          href={`${base}/members`}
          onClick={onNavigate}
          className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Invite People
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-hide">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Community
        </p>
        <nav className="mb-5 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon, href }) => {
            const active = navActive(id, href);
            const linkHref =
              id === "announcements" ? announcementsHref : href ? `${base}${href}` : base;
            return (
              <Link
                key={id}
                href={linkHref}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                  active
                    ? "bg-orange-50 font-semibold text-orange-600"
                    : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-orange-500" : "text-gray-400"
                  )}
                />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* GROUPS */}
        <div className="mb-1.5 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setGroupsOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
          >
            Groups
            {groupsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {canManage && communityId && (
            <button
              type="button"
              aria-label="Create group"
              onClick={() => setCreateGroupOpen(true)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-orange-500"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {groupsOpen && (
          <nav className="mb-5 space-y-0.5">
            {groups.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-gray-400">No groups yet</p>
            ) : (
              groups.map((group) => {
                const active = groupActive(group);
                return (
                  <Link
                    key={group.id}
                    href={`${base}${group.href}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-orange-50 font-semibold text-orange-600"
                        : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate">{group.label}</span>
                    {group.live && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Live
                      </span>
                    )}
                    {!group.live && group.unread ? (
                      <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        {group.unread}
                      </span>
                    ) : null}
                  </Link>
                );
              })
            )}
          </nav>
        )}

        {/* CHANNELS */}
        <div className="mb-1.5 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setChannelsOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
          >
            Channels
            {channelsOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {canManage && (
            <button
              type="button"
              aria-label="Create channel"
              onClick={() => setCreateChannelOpen(true)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-orange-500"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {channelsOpen && (
          <nav className="space-y-0.5">
            {channels.map((channel) => {
              const active = channelActive(channel);
              return (
                <Link
                  key={channel.id}
                  href={`${base}${channel.href}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                    active
                      ? "bg-orange-50 font-semibold text-orange-600"
                      : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <span className="w-4 shrink-0 text-center text-[13px]" aria-hidden>
                    {channel.emoji}
                  </span>
                  <span className="truncate">{channel.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {communityId && (
        <CreateSpaceDialog
          open={createGroupOpen}
          onOpenChange={setCreateGroupOpen}
          communityId={communityId}
          entityLabel="Group"
          onCreated={() => {
            router.refresh();
            onNavigate?.();
          }}
        />
      )}
      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
        spaceId={channelsHomeSpaceId}
        onCreated={() => {
          router.refresh();
          onNavigate?.();
        }}
      />
    </>
  );
}

export function CommunitySidebar({
  slug,
  communityName = MOCK_COMMUNITY.name,
  visibility = MOCK_COMMUNITY.visibility,
  membersOnline = MOCK_COMMUNITY.membersOnline,
  activeNav,
  activeSpaceId,
  spaces: spacesProp,
  mobileOpen,
  onMobileClose,
}: CommunitySidebarProps) {
  const workspace = useWorkspaceOptional();
  const spacesWithRooms = workspace?.spacesWithRooms ?? [];

  const groups = useMemo(() => {
    if (spacesProp !== undefined) return spacesProp;
    return buildGroups(spacesWithRooms);
  }, [spacesProp, spacesWithRooms]);

  const channels = useMemo(
    () => buildChannels(spacesWithRooms),
    [spacesWithRooms]
  );

  const channelsHomeSpaceId = useMemo(
    () => resolveChannelsHomeSpaceId(spacesWithRooms),
    [spacesWithRooms]
  );

  const canManage = Boolean(workspace?.isOwner || workspace?.isAdmin);
  const communityId = workspace?.communityId ?? null;
  const resolvedVisibility =
    workspace?.isPrivate != null
      ? workspace.isPrivate
        ? "Private"
        : "Public"
      : visibility;

  const memberCount =
    workspace?.overview?.memberCount ??
    workspace?.memberCount ??
    (typeof membersOnline === "number" && membersOnline > 0 ? membersOnline : 0);

  const bodyProps = {
    slug,
    communityName: workspace?.communityName ?? communityName,
    visibility: resolvedVisibility,
    memberCount,
    activeNav,
    activeSpaceId,
    groups,
    channels,
    spacesWithRooms,
    canManage,
    communityId,
    channelsHomeSpaceId,
  };

  if (mobileOpen !== undefined) {
    if (!mobileOpen) return null;

    return (
      <>
        <div
          className="fixed inset-0 z-[99] bg-black/40 lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
        <aside className="fixed inset-y-0 left-0 z-[100] flex w-[min(288px,86vw)] flex-col bg-white shadow-xl lg:hidden">
          <div className="flex items-center justify-end px-3 pt-3">
            <button
              type="button"
              aria-label="Close community menu"
              onClick={onMobileClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarBody {...bodyProps} onNavigate={onMobileClose} />
        </aside>
      </>
    );
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-100 bg-white">
      <SidebarBody {...bodyProps} />
    </aside>
  );
}
