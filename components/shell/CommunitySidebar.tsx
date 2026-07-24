"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
  Megaphone,
  MessageSquare,
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
import {
  communityChannelHref,
  communityGroupHref,
} from "@/lib/community/workspace";

type CommunityNavItem =
  | "overview"
  | "announcements"
  | "feed"
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
  slug?: string;
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
  groupSlug?: string;
  channelSlug?: string;
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

/** Legacy system space slugs — still valid Groups if they exist; no longer auto-created. */
const LEGACY_SYSTEM_SPACE_SLUGS = new Set([
  "general",
  "announcements",
  "resources",
  "channels",
]);

const NAV_ITEMS: NavLink[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "" },
  { id: "announcements", label: "Announcements", icon: Megaphone, href: "/feed" },
  { id: "feed", label: "Feed", icon: MessageSquare, href: "/feed" },
  { id: "events", label: "Events", icon: Calendar, href: "/events" },
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

function channelEmoji(room: WorkspaceRoomRow): string {
  if (room.room_type === "posts" || /announcement/i.test(room.name)) return "📢";
  if (room.room_type === "resources" || /resource/i.test(room.name)) return "📚";
  if (room.room_type === "voice" || /voice/i.test(room.name)) return "🎤";
  if (/signal/i.test(room.name)) return "📈";
  return "💬";
}

/** Only real channels — never fabricate placeholder nav items. */
function buildChannels(
  communitySlug: string,
  spacesWithRooms: WorkspaceSpaceRow[]
): ChannelItem[] {
  return spacesWithRooms.flatMap((space) =>
    space.rooms
      .filter(
        (room) =>
          room.room_type !== "posts" && !/announcement/i.test(room.name)
      )
      .map((room) => ({
        id: room.id,
        label: room.name,
        emoji: channelEmoji(room),
        href: communityChannelHref(
          communitySlug,
          room.slug
        ).replace(`/communities/${communitySlug}`, ""),
        roomId: room.id,
        spaceId: space.id,
        groupSlug: space.slug,
        channelSlug: room.slug,
      }))
  );
}

function buildGroups(
  communitySlug: string,
  spacesWithRooms: WorkspaceSpaceRow[]
): GroupItem[] {
  return spacesWithRooms.map((space) => ({
    id: space.id,
    slug: space.slug,
    label: space.name,
    href: communityGroupHref(communitySlug, space.slug).replace(
      `/communities/${communitySlug}`,
      ""
    ),
  }));
}

function resolveChannelsHomeSpaceId(spacesWithRooms: WorkspaceSpaceRow[]): string | null {
  if (spacesWithRooms.length === 0) return null;
  const preferred = spacesWithRooms.find(
    (s) => !LEGACY_SYSTEM_SPACE_SLUGS.has(s.slug)
  );
  return (preferred ?? spacesWithRooms[0]).id;
}

function resolveAnnouncementsHref(
  communitySlug: string,
  spacesWithRooms: WorkspaceSpaceRow[]
): string {
  for (const space of spacesWithRooms) {
    const room = space.rooms.find(
      (r) => r.room_type === "posts" || /announcement/i.test(r.name)
    );
    if (room) {
      return communityChannelHref(communitySlug, room.slug);
    }
  }
  return `/communities/${communitySlug}/feed`;
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
  const router = useRouter();
  const base = `/communities/${slug}`;
  const [groupsOpen, setGroupsOpen] = useState(true);
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [createChannelOpen, setCreateChannelOpen] = useState(false);

  const announcementsHref = resolveAnnouncementsHref(slug, spacesWithRooms);

  function navActive(id: CommunityNavItem, href: string) {
    if (activeNav) return activeNav === id;
    if (id === "announcements") {
      for (const space of spacesWithRooms) {
        const room = space.rooms.find(
          (r) => r.room_type === "posts" || /announcement/i.test(r.name)
        );
        if (room && pathname.includes(`/channels/${room.slug}`)) {
          return true;
        }
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
    const groupSlug =
      group.slug ??
      group.href.replace(/^\/groups\//, "").split("/")[0] ??
      "";
    if (!groupSlug) return false;
    return (
      pathname === `${base}/groups/${groupSlug}` ||
      pathname.startsWith(`${base}/groups/${groupSlug}/`)
    );
  }

  function channelActive(channel: ChannelItem) {
    if (!channel.roomId) {
      if (channel.href === "/chat") return pathname.startsWith(`${base}/chat`);
      if (channel.href === "/live") return pathname.startsWith(`${base}/live`);
      return false;
    }
    if (channel.channelSlug) {
      return (
        pathname === `${base}/channels/${channel.channelSlug}` ||
        pathname.startsWith(`${base}/channels/${channel.channelSlug}/`)
      );
    }
    return false;
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
              href={`/dashboard/communities/${encodeURIComponent(slug)}/settings`}
              onClick={onNavigate}
              aria-label="Owner Console"
              title="Owner Console"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Link
            href={`${base}/members`}
            onClick={onNavigate}
            className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
          >
            Invite People
          </Link>
          {canManage && (
            <Link
              href={`/dashboard/communities/${encodeURIComponent(slug)}`}
              onClick={onNavigate}
              className="flex w-full items-center justify-center rounded-xl border border-orange-200 bg-orange-50 py-2 text-[12px] font-semibold text-orange-700 transition-colors hover:bg-orange-100"
            >
              Owner Console
            </Link>
          )}
        </div>
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
              <div className="mx-1 rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-[12px] font-medium text-gray-700">
                  {canManage
                    ? "Create your first Group"
                    : "No Groups published yet"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  {canManage
                    ? "Organize members, then add Channels inside the Group."
                    : "This community is being prepared. Check back soon."}
                </p>
                {canManage && communityId ? (
                  <button
                    type="button"
                    onClick={() => setCreateGroupOpen(true)}
                    className="mt-2.5 inline-flex min-h-9 items-center rounded-lg bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-600"
                  >
                    Create Group
                  </button>
                ) : null}
              </div>
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
          {canManage && channelsHomeSpaceId && (
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
            {channels.length === 0 ? (
              <div className="mx-1 rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-[12px] font-medium text-gray-700">
                  {groups.length === 0
                    ? "Channels appear inside Groups"
                    : canManage
                      ? "No Channels yet"
                      : "No Channels published yet"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  {groups.length === 0
                    ? canManage
                      ? "Create a Group first, then add Channels."
                      : "Check back once Groups are published."
                    : canManage
                      ? "Add a Channel to start discussions."
                      : "Your host will publish Channels soon."}
                </p>
              </div>
            ) : (
              channels.map((channel) => {
                const active = channelActive(channel);
                return (
                  <Link
                    key={channel.id}
                    href={
                      channel.href.startsWith("http") || channel.href.startsWith("/communities")
                        ? channel.href
                        : `${base}${channel.href}`
                    }
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-orange-50 font-semibold text-orange-600"
                        : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <span className="text-[14px]" aria-hidden>
                      {channel.emoji}
                    </span>
                    <span className="truncate">{channel.label}</span>
                  </Link>
                );
              })
            )}
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
    return buildGroups(slug, spacesWithRooms);
  }, [spacesProp, spacesWithRooms, slug]);

  const channels = useMemo(
    () => buildChannels(slug, spacesWithRooms),
    [spacesWithRooms, slug]
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
