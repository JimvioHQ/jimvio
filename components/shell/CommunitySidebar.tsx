"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";

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
  active?: boolean;
};

type CommunitySidebarProps = {
  slug: string;
  communityName?: string;
  visibility?: string;
  membersOnline?: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces?: SpaceItem[];
};

const NAV_ITEMS: { id: CommunityNavItem; label: string; icon: typeof LayoutGrid; href: string; dot?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "" },
  { id: "announcements", label: "Announcements", icon: Megaphone, href: "/announcements", dot: true },
  { id: "events", label: "Events", icon: Calendar, href: "/events" },
  { id: "courses", label: "Courses", icon: BookOpen, href: "/courses" },
  { id: "members", label: "Members", icon: Users, href: "/members" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, href: "/leaderboard" },
  { id: "challenges", label: "Challenges", icon: Target, href: "/missions" },
  { id: "about", label: "About", icon: FileText, href: "/about" },
];

const DEFAULT_SPACES: SpaceItem[] = [
  { id: "general", label: "General Chat", href: "/chat", unread: 3 },
  { id: "live-trading", label: "Live Trading", href: "/chat?space=live-trading", live: true, unread: 12 },
  { id: "signals", label: "Signals", href: "/chat?space=signals", unread: 5 },
  { id: "resources", label: "Resources", href: "/chat?space=resources" },
  { id: "voice", label: "Voice Room", href: "/chat?space=voice" },
];

const TOOLS = [
  { label: "Community Calendar", icon: Calendar, href: "/events" },
  { label: "Creator Toolkit", icon: Wrench, href: "/toolkit" },
  { label: "Live Schedule", icon: Mic, href: "/live" },
  { label: "Polls", icon: BarChart3, href: "/polls" },
  { label: "File Center", icon: FileText, href: "/files" },
  { label: "Question & Answers", icon: HelpCircle, href: "/qa" },
  { label: "Feedback & Ideas", icon: MessageSquare, href: "/feedback" },
];

export function CommunitySidebar({
  slug,
  communityName = MOCK_COMMUNITY.name,
  visibility = MOCK_COMMUNITY.visibility,
  membersOnline = MOCK_COMMUNITY.membersOnline,
  activeNav = "overview",
  activeSpaceId,
  spaces = DEFAULT_SPACES,
}: CommunitySidebarProps) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);

  function navActive(id: CommunityNavItem, href: string) {
    if (activeNav) return activeNav === id;
    const full = href ? `${base}${href}` : base;
    if (!href) return pathname === base || pathname === `${base}/`;
    return pathname.startsWith(full);
  }

  function spaceActive(space: SpaceItem) {
    if (activeSpaceId) return activeSpaceId === space.id;
    return pathname.includes("/chat") && space.id === "general";
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-sm font-semibold text-green-700">
            {communityName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-sm font-semibold text-gray-900">{communityName}</p>
              <svg className="h-3.5 w-3.5 shrink-0 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">{visibility}</p>
            <p className="text-xs text-gray-400">{membersOnline.toLocaleString()} online</p>
          </div>
          <button type="button" aria-label="Community settings" className="text-gray-400 hover:text-gray-600">
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          className="w-full rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Invite People
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <nav className="mb-4 space-y-0.5">
          {NAV_ITEMS.map(({ id, label, icon: Icon, href, dot }) => {
            const active = navActive(id, href);
            return (
              <Link
                key={id}
                href={href ? `${base}${href}` : base}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-orange-50 font-medium text-orange-500" : "text-gray-700 hover:bg-gray-50"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-orange-500" : "text-gray-500")} />
                <span className="truncate">{label}</span>
                {dot && <span className="ml-auto h-2 w-2 rounded-full bg-orange-500" />}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setSpacesOpen((o) => !o)}
          className="mb-2 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
        >
          Spaces
          {spacesOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {spacesOpen && (
          <nav className="mb-4 space-y-0.5">
            {spaces.map((space) => {
              const active = spaceActive(space);
              return (
                <Link
                  key={space.id}
                  href={`${base}${space.href.replace("/chat", "/chat")}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-orange-50 font-medium text-orange-500" : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-gray-500" />
                  <span className="truncate">{space.label}</span>
                  {space.live && (
                    <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white">
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
            })}
          </nav>
        )}

        <button
          type="button"
          onClick={() => setToolsOpen((o) => !o)}
          className="mb-2 flex w-full items-center justify-between px-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400"
        >
          Tools
          {toolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {toolsOpen && (
          <nav className="space-y-0.5">
            {TOOLS.map(({ label, icon: Icon, href }) => (
              <Link
                key={label}
                href={`${base}${href}`}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 shrink-0 text-gray-500" />
                <span className="truncate">{label}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
