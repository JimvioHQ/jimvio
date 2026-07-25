"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Home,
  Plus,
  UserPlus,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";
import {
  useWorkspaceOptional,
  type WorkspaceSpaceRow,
} from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { communitySpaceHref } from "@/lib/community/workspace";

type CommunityNavItem = "overview" | "spaces";

type SpaceItem = {
  id: string;
  label: string;
  href: string;
  slug?: string;
  memberCount?: number;
  iconColor?: string;
  iconUrl?: string | null;
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
    memberCount: space.member_count ?? 0,
    iconColor: SPACE_ICON_COLORS[index % SPACE_ICON_COLORS.length],
    iconUrl: space.icon,
  }));
}

function SidebarBody({
  slug,
  communityName,
  visibility,
  avatarUrl,
  activeSpaceId,
  spaces,
  canManage,
  communityId,
  isVerified,
  onNavigate,
}: {
  slug: string;
  communityName: string;
  visibility: string;
  avatarUrl: string | null;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces: SpaceItem[];
  canManage: boolean;
  communityId: string | null;
  isVerified?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/communities/${slug}`;
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

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

        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-[#fd5000] shadow-sm">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                  {communityName.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[15px] font-bold tracking-tight text-gray-900">
                  {communityName}
                </p>
                {isVerified ? (
                  <BadgeCheck
                    className="h-4 w-4 shrink-0 text-[#3b82f6]"
                    fill="currentColor"
                    strokeWidth={0}
                    aria-label="Verified"
                  />
                ) : null}
              </div>
              <p className="mt-0.5 text-[12px] text-gray-500">
                {visibility === "Private" ? "Private" : "Public"} Community
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Link
            href={`${base}/subscribe`}
            onClick={onNavigate}
            className="flex w-full items-center justify-center rounded-xl bg-[#fd5000] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e04700]"
          >
            Join Community
          </Link>
          <Link
            href={`${base}/members`}
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            <UserPlus className="h-4 w-4" />
            Invite People
          </Link>
        </div>
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
            Overview
          </Link>
        </nav>

        <div className="mb-1.5 flex items-center justify-between px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Spaces
          </p>
          {canManage && communityId ? (
            <button
              type="button"
              aria-label="Create space"
              onClick={() => setCreateSpaceOpen(true)}
              className="rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-[#fd5000]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
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
              const count = space.memberCount ?? 0;
              return (
                <Link
                  key={space.id}
                  href={`${base}${space.href}`}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors",
                    active
                      ? "bg-orange-50"
                      : "hover:bg-gray-50"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[11px] font-bold text-white",
                      color
                    )}
                  >
                    {space.iconUrl && /^https?:\/\//.test(space.iconUrl) ? (
                      <Image
                        src={space.iconUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      letter
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[13px]",
                        active
                          ? "font-semibold text-[#fd5000]"
                          : "font-medium text-gray-800"
                      )}
                    >
                      {space.label}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {formatMemberCount(count)} members
                    </span>
                  </span>
                </Link>
              );
            })
          )}
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
  membersOnline: _membersOnline = MOCK_COMMUNITY.membersOnline,
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

  const bodyProps = {
    slug,
    communityName: workspace?.communityName ?? communityName,
    visibility: resolvedVisibility,
    avatarUrl: workspace?.overview?.avatarUrl ?? workspace?.avatarUrl ?? null,
    activeNav,
    activeSpaceId,
    spaces,
    canManage,
    communityId,
    isVerified: Boolean(workspace?.overview?.isVerified),
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
