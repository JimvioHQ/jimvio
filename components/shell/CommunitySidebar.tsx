"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
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
  type WorkspaceSpaceRow,
} from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import {
  communitySpaceHref,
} from "@/lib/community/workspace";

type CommunityNavItem =
  | "overview"
  | "courses"
  | "challenges"
  | "about";

type NavLink = {
  id: CommunityNavItem;
  label: string;
  icon: typeof LayoutGrid;
  href: string;
};

type SpaceItem = {
  id: string;
  label: string;
  href: string;
  slug?: string;
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

/** Default member community nav — management surfaces live in Owner Console. */
const NAV_ITEMS: NavLink[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid, href: "" },
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

function buildSpaces(
  communitySlug: string,
  spacesWithRooms: WorkspaceSpaceRow[]
): SpaceItem[] {
  return spacesWithRooms.map((space) => ({
    id: space.id,
    slug: space.slug,
    label: space.name,
    href: communitySpaceHref(communitySlug, space.slug).replace(
      `/communities/${communitySlug}`,
      ""
    ),
  }));
}

function SidebarBody({
  slug,
  communityName,
  visibility,
  memberCount,
  activeNav,
  activeSpaceId,
  spaces,
  canManage,
  communityId,
  onNavigate,
}: {
  slug: string;
  communityName: string;
  visibility: string;
  memberCount: number;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces: SpaceItem[];
  canManage: boolean;
  communityId: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/communities/${slug}`;
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  function navActive(id: CommunityNavItem, href: string) {
    if (activeNav) return activeNav === id;
    if (id === "about") {
      return pathname === `${base}/about` || pathname.startsWith(`${base}/about/`);
    }
    const full = href ? `${base}${href.split("?")[0]}` : base;
    if (!href) {
      return pathname === base || pathname === `${base}/`;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  function spaceActive(space: SpaceItem) {
    if (activeSpaceId) return activeSpaceId === space.id;
    const spaceSlug =
      space.slug ??
      space.href.replace(/^\/spaces\//, "").replace(/^\/groups\//, "").split("/")[0] ??
      "";
    if (!spaceSlug) return false;
    return (
      pathname === `${base}/spaces/${spaceSlug}` ||
      pathname.startsWith(`${base}/spaces/${spaceSlug}/`) ||
      pathname === `${base}/groups/${spaceSlug}` ||
      pathname.startsWith(`${base}/groups/${spaceSlug}/`)
    );
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
            const linkHref = href ? `${base}${href}` : base;
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

        {/* SPACES */}
        <div className="mb-1.5 flex items-center justify-between px-3">
          <button
            type="button"
            onClick={() => setSpacesOpen((o) => !o)}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400"
          >
            Spaces
            {spacesOpen ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
          {canManage && communityId && (
            <button
              type="button"
              aria-label="Create space"
              onClick={() => setCreateSpaceOpen(true)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-orange-500"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {spacesOpen && (
          <nav className="mb-5 space-y-0.5">
            {spaces.length === 0 ? (
              <div className="mx-1 rounded-xl bg-gray-50 px-3 py-3">
                <p className="text-[12px] font-medium text-gray-700">
                  {canManage
                    ? "Create your first Space"
                    : "No Spaces published yet"}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-400">
                  {canManage
                    ? "Organize members into Spaces for discussion, resources, and live sessions."
                    : "This community is being prepared. Check back soon."}
                </p>
                {canManage && communityId ? (
                  <button
                    type="button"
                    onClick={() => setCreateSpaceOpen(true)}
                    className="mt-2.5 inline-flex min-h-9 items-center rounded-lg bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-600"
                  >
                    Create Space
                  </button>
                ) : null}
              </div>
            ) : (
              spaces.map((space) => {
                const active = spaceActive(space);
                return (
                  <div key={space.id} className="space-y-0.5">
                    <Link
                      href={`${base}${space.href}`}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
                        active
                          ? "bg-orange-50 font-semibold text-orange-600"
                          : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <Users className="h-4 w-4 shrink-0 text-gray-400" />
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
                  </div>
                );
              })
            )}
          </nav>
        )}

        {/* DISCOVER */}
        <div className="mb-1.5 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Discover
          </p>
        </div>
        <nav className="mb-5 space-y-0.5">
          <Link
            href={`${base}/spaces`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Trending Spaces
          </Link>
          <Link
            href={`${base}/live`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Live Spaces
          </Link>
          <Link
            href={`${base}/spaces`}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            New Spaces
            <span className="ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600">
              New
            </span>
          </Link>
        </nav>
      </div>

      {communityId && (
        <CreateSpaceDialog
          open={createSpaceOpen}
          onOpenChange={setCreateSpaceOpen}
          communityId={communityId}
          onCreated={() => {
            router.refresh();
            onNavigate?.();
          }}
        />
      )}
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

  const spaces = useMemo(() => {
    if (spacesProp !== undefined) return spacesProp;
    return buildSpaces(slug, spacesWithRooms);
  }, [spacesProp, spacesWithRooms, slug]);

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
    spaces,
    canManage,
    communityId,
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
