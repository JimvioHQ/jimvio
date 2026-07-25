"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  LayoutGrid,
  Plus,
  Settings,
  Star,
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
  | "spaces";

type SpaceItem = {
  id: string;
  label: string;
  href: string;
  slug?: string;
  unread?: number;
  live?: boolean;
  iconColor?: string;
};

const SPACE_ICON_COLORS = [
  "bg-violet-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-orange-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
];

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
  return spacesWithRooms.map((space, index) => ({
    id: space.id,
    slug: space.slug,
    label: space.name,
    href: communitySpaceHref(communitySlug, space.slug).replace(
      `/communities/${communitySlug}`,
      ""
    ),
    iconColor: SPACE_ICON_COLORS[index % SPACE_ICON_COLORS.length],
  }));
}

function SidebarBody({
  slug,
  communityName,
  visibility,
  memberCount,
  activeSpaceId,
  spaces,
  canManage,
  communityId,
  isMember,
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
  isMember?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/communities/${slug}`;
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [starred, setStarred] = useState<Record<string, boolean>>({});

  const onSpacesRoute =
    pathname.includes("/spaces/") ||
    pathname.includes("/groups/") ||
    pathname.endsWith("/spaces");
  const onHome =
    pathname === base ||
    pathname === `${base}/` ||
    pathname === `${base}/overview`;

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
          Back to communities
        </Link>

        <div className="mb-3 flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fd5000] text-sm font-bold text-white shadow-sm">
            {communityName.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-[15px] font-bold tracking-tight text-gray-900">
                {communityName}
              </p>
              <svg
                className="h-3.5 w-3.5 shrink-0 text-[#fd5000]"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <p className="text-[12px] text-gray-500">
              {visibility === "Private" ? "Private" : "Public"} Community
              <span className="mx-1 text-gray-300">·</span>
              {formatMemberCount(memberCount)} members
            </p>
          </div>
          {canManage && (
            <Link
              href={`/dashboard/communities/${encodeURIComponent(slug)}/settings`}
              onClick={onNavigate}
              aria-label="Owner Console"
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
            >
              <Settings className="h-4 w-4" />
            </Link>
          )}
        </div>

        {!isMember ? (
          <Link
            href={`${base}/subscribe`}
            onClick={onNavigate}
            className="flex w-full items-center justify-center rounded-xl border border-[#fd5000]/30 bg-white py-2.5 text-sm font-semibold text-[#fd5000] transition-colors hover:bg-orange-50"
          >
            Join Community
          </Link>
        ) : (
          <Link
            href={`${base}/members`}
            onClick={onNavigate}
            className="flex w-full items-center justify-center rounded-xl bg-[#fd5000] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e04700]"
          >
            Invite People
          </Link>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 py-3 scrollbar-hide">
        <nav className="mb-4 space-y-0.5">
          <Link
            href={base}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
              onHome && !onSpacesRoute
                ? "bg-orange-50 font-semibold text-[#fd5000]"
                : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            Community Home
          </Link>
          <Link
            href={`${base}/spaces`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] transition-colors",
              onSpacesRoute
                ? "bg-orange-50 font-semibold text-[#fd5000]"
                : "font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            Spaces
          </Link>
        </nav>

        <div className="mb-1.5 flex items-center justify-between px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            My Spaces
          </p>
          {canManage && communityId && (
            <button
              type="button"
              aria-label="Create space"
              onClick={() => setCreateSpaceOpen(true)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#fd5000]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <nav className="mb-5 space-y-0.5">
          {spaces.length === 0 ? (
            <div className="mx-1 rounded-xl bg-gray-50 px-3 py-3">
              <p className="text-[12px] font-medium text-gray-700">
                {canManage ? "Create your first Space" : "No Spaces published yet"}
              </p>
              {canManage && communityId ? (
                <button
                  type="button"
                  onClick={() => setCreateSpaceOpen(true)}
                  className="mt-2.5 inline-flex min-h-9 items-center rounded-lg bg-[#fd5000] px-3 text-[12px] font-semibold text-white hover:bg-[#e04700]"
                >
                  Create Space
                </button>
              ) : null}
            </div>
          ) : (
            spaces.map((space, index) => {
              const active = spaceActive(space);
              const color =
                space.iconColor ??
                SPACE_ICON_COLORS[index % SPACE_ICON_COLORS.length];
              const letter = (space.label.trim()[0] || "S").toUpperCase();
              return (
                <div
                  key={space.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-xl pr-1",
                    active ? "bg-orange-50" : "hover:bg-gray-50"
                  )}
                >
                  <Link
                    href={`${base}${space.href}`}
                    onClick={onNavigate}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px]",
                      active
                        ? "font-semibold text-[#fd5000]"
                        : "font-medium text-gray-600"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white",
                        color
                      )}
                    >
                      {letter}
                    </span>
                    <span className="truncate">{space.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={starred[space.id] ? "Unstar space" : "Star space"}
                    onClick={() =>
                      setStarred((prev) => ({
                        ...prev,
                        [space.id]: !prev[space.id],
                      }))
                    }
                    className="rounded-md p-1.5 text-gray-300 opacity-0 transition group-hover:opacity-100 hover:text-amber-400"
                  >
                    <Star
                      className={cn(
                        "h-3.5 w-3.5",
                        starred[space.id] && "fill-amber-400 text-amber-400 opacity-100"
                      )}
                    />
                  </button>
                </div>
              );
            })
          )}
        </nav>

        <div className="mb-1.5 px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Discover
          </p>
        </div>
        <nav className="mb-4 space-y-0.5">
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

        <div className="mt-auto px-1 pb-2">
          <div className="rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white px-3.5 py-3.5">
            <p className="text-[13px] font-bold text-gray-900">Go Premium</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Unlock exclusive Spaces and live sessions.
            </p>
            <Link
              href={`${base}/subscribe`}
              onClick={onNavigate}
              className="mt-2 inline-flex text-[12px] font-semibold text-[#fd5000] hover:underline"
            >
              Upgrade now →
            </Link>
          </div>
        </div>
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
    isMember: Boolean(workspace?.membership),
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
