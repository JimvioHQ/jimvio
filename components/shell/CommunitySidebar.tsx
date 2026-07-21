"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  LayoutGrid,
  Megaphone,
  MessageSquare,
  Mic,
  Settings,
  Target,
  Trophy,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";
import { useWorkspaceOptional } from "@/components/community/workspace-context";

type CommunityNavItem =
  | "overview"
  | "announcements"
  | "events"
  | "courses"
  | "members"
  | "leaderboard"
  | "challenges"
  | "about"
  | "chat";

type SpaceItem = {
  id: string;
  label: string;
  href: string;
  unread?: number;
  live?: boolean;
};

type CommunitySidebarProps = {
  slug: string;
  communityName?: string;
  visibility?: string;
  membersOnline?: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces?: SpaceItem[];
  /** Mobile drawer mode (rendered from HubLayout). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

const NAV_ITEMS: {
  id: CommunityNavItem;
  label: string;
  icon: typeof LayoutGrid;
  href: string;
  dot?: boolean;
}[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "" },
  { id: "announcements", label: "Feed", icon: Megaphone, href: "/feed" },
  { id: "events", label: "Events", icon: Calendar, href: "/live" },
  { id: "courses", label: "Courses", icon: BookOpen, href: "/courses" },
  { id: "members", label: "Members", icon: Users, href: "/members" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
  { id: "challenges", label: "Challenges", icon: Target, href: "/missions" },
];

const DEFAULT_SPACES: SpaceItem[] = [];

function mapWorkspaceSpaces(
  spacesWithRooms: { id: string; name: string; slug: string; rooms: { id: string; space_id: string }[] }[]
): SpaceItem[] {
  return spacesWithRooms.map((space) => {
    const firstRoom = space.rooms[0];
    const href = firstRoom
      ? `/room?space=${space.id}&room=${firstRoom.id}`
      : `/chat?space=${encodeURIComponent(space.slug)}`;
    return { id: space.id, label: space.name, href };
  });
}

const TOOLS = [
  { label: "Community Calendar", icon: Calendar, href: "/events" },
  { label: "Creator Toolkit", icon: Wrench, href: "/toolkit" },
  { label: "Live Schedule", icon: Mic, href: "/live" },
  { label: "Polls", icon: BarChart3, href: "/polls" },
  { label: "File Center", icon: FileText, href: "/files" },
  { label: "Question & Answers", icon: HelpCircle, href: "/qa" },
  { label: "Feedback & Ideas", icon: MessageSquare, href: "/feedback" },
];

function SidebarBody({
  slug,
  communityName,
  visibility,
  membersOnline,
  activeNav,
  activeSpaceId,
  spaces,
  onNavigate,
}: {
  slug: string;
  communityName: string;
  visibility: string;
  membersOnline: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces: SpaceItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/communities/${slug}`;
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);

  function navActive(id: CommunityNavItem, href: string) {
    const full = href ? `${base}${href.split("?")[0]}` : base;
    if (activeNav) return activeNav === id;
    if (!href) {
      return pathname === base || pathname === `${base}/`;
    }
    if (id === "chat") return pathname.startsWith(`${base}/chat`);
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  function spaceActive(space: SpaceItem) {
    if (activeSpaceId) return activeSpaceId === space.id;
    if (pathname.includes("/room") || pathname.includes("/chat")) {
      const spaceQuery = space.href.includes("space=")
        ? space.href.split("space=")[1]?.split("&")[0]
        : null;
      const currentSpace = searchParams.get("space");
      if (spaceQuery && currentSpace) return currentSpace === spaceQuery;
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
              {membersOnline.toLocaleString()} online
            </p>
          </div>
          <button
            type="button"
            aria-label="Community settings"
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Invite People
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 scrollbar-hide">
        <nav className="mb-5 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon, href, dot }) => {
            const active = navActive(id, href);
            return (
              <Link
                key={id}
                href={href ? `${base}${href}` : base}
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
                {dot && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSpacesOpen((o) => !o)}
          className="mb-1.5 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
        >
          Spaces
          {spacesOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {spacesOpen && (
          <nav className="mb-5 space-y-0.5">
            {spaces.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-gray-400">No spaces yet</p>
            ) : (
              spaces.map((space) => {
                const active = spaceActive(space);
                return (
                  <Link
                    key={space.id}
                    href={`${base}${space.href}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                      active
                        ? "bg-orange-50 font-semibold text-orange-600"
                        : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate">{space.label}</span>
                    {space.live && (
                      <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        Live
                      </span>
                    )}
                    {!space.live && space.unread ? (
                      <span className="ml-auto rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
                        {space.unread}
                      </span>
                    ) : null}
                  </Link>
                );
              })
            )}
          </nav>
        )}

        <button
          type="button"
          onClick={() => setToolsOpen((o) => !o)}
          className="mb-1.5 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
        >
          Tools
          {toolsOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </button>
        {toolsOpen && (
          <nav className="space-y-0.5">
            {TOOLS.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={`${base}${href}`}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
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
  const spaces =
    spacesProp !== undefined
      ? spacesProp
      : workspace?.spacesWithRooms?.length
        ? mapWorkspaceSpaces(workspace.spacesWithRooms)
        : DEFAULT_SPACES;

  const bodyProps = {
    slug,
    communityName,
    visibility,
    membersOnline,
    activeNav,
    activeSpaceId,
    spaces,
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
