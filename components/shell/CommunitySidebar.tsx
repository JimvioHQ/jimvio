"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, Layers, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_COMMUNITY } from "@/lib/community/dashboard-mock-data";
import {
  useWorkspaceOptional,
  type WorkspaceSpaceRow,
} from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import {
  communitySpaceHref,
  resolvePrimarySpace,
  resolveSpaceAvatarSrc,
} from "@/lib/community/workspace";
import { safeMediaUrl } from "@/lib/media/optimize-url";

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
  spacesWithRooms: WorkspaceSpaceRow[],
  communityAvatar?: string | null,
  communityCover?: string | null
): SpaceItem[] {
  const primary = resolvePrimarySpace(spacesWithRooms);
  const list = primary ? [primary] : spacesWithRooms.slice(0, 1);
  return list.map((space) => ({
    id: space.id,
    slug: space.slug,
    label: space.name,
    href: communitySpaceHref(communitySlug, space.slug).replace(
      `/communities/${communitySlug}`,
      ""
    ),
    memberCount: space.member_count ?? 0,
    iconColor: "bg-orange-500",
    iconUrl:
      safeMediaUrl(
        resolveSpaceAvatarSrc(space, communityAvatar, communityCover) ?? undefined,
        96
      ) ?? space.icon,
  }));
}

function SidebarBody({
  slug,
  activeSpaceId,
  spaces,
  canManage,
  communityId,
  onNavigate,
}: {
  slug: string;
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
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  const onSpacesRoute =
    pathname.includes("/spaces/") ||
    pathname.includes("/groups/") ||
    pathname === `${base}/spaces` ||
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

  const onSpacesIndex = pathname === `${base}/spaces` || pathname === `${base}/spaces/`;

  return (
    <>
      <div className="border-b border-[var(--color-border)] px-4 pb-3.5 pt-3.5">
        <Link
          href="/communities"
          onClick={onNavigate}
          className="inline-flex min-h-11 items-center gap-1.5 text-[12px] font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Feed
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 py-3.5 scrollbar-hide">
        <nav className="mb-6 space-y-1">
          <Link
            href={base}
            onClick={onNavigate}
            aria-current={onHome && !onSpacesRoute ? "page" : undefined}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
              onHome && !onSpacesRoute
                ? "bg-[var(--color-accent-light)] font-semibold text-[#fd5000] shadow-[inset_3px_0_0_0_#fd5000]"
                : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <Home className="h-4 w-4 shrink-0" />
            Overview
          </Link>
          <Link
            href={`${base}/spaces`}
            onClick={onNavigate}
            className={cn(
              "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
              onSpacesRoute
                ? "bg-[var(--color-accent-light)] font-semibold text-[#fd5000] shadow-[inset_3px_0_0_0_#fd5000]"
                : "font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            )}
            aria-current={onSpacesIndex ? "page" : undefined}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span className="flex-1">Spaces</span>
            {spaces.length > 0 ? (
              <span
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  onSpacesRoute
                    ? "bg-[#fd5000]/15 text-[#fd5000]"
                    : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
                )}
              >
                {spaces.length}
              </span>
            ) : null}
          </Link>
        </nav>

        <div className="mb-2 flex items-center justify-between px-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Space
          </p>
          {canManage && communityId ? (
            <button
              type="button"
              aria-label="Create space"
              onClick={() => setCreateSpaceOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-light)] hover:text-[#fd5000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <nav className="mb-5 space-y-1">
          {spaces.length === 0 ? (
            canManage && communityId ? (
              <button
                type="button"
                onClick={() => setCreateSpaceOpen(true)}
                className="mx-1 flex min-h-11 w-[calc(100%-0.5rem)] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-light)] hover:text-[#fd5000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Create First Space
              </button>
            ) : (
              <p className="px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
                No spaces available yet.
              </p>
            )
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
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
                    active
                      ? "bg-[var(--color-accent-light)] shadow-[inset_3px_0_0_0_#fd5000]"
                      : "hover:bg-[var(--color-surface-secondary)]"
                  )}
                >
                  <span
                    className={cn(
                      "relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold text-white",
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
                          : "font-medium text-[var(--color-text-primary)]"
                      )}
                    >
                      {space.label}
                    </span>
                    <span className="block text-[11px] text-[var(--color-text-muted)]">
                      {formatMemberCount(count)} members
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </nav>

        <div className="mt-auto px-1 pb-2">
          <div className="rounded-2xl border border-[var(--color-accent)]/20 bg-gradient-to-br from-[var(--color-accent-light)] to-[var(--color-surface)] px-3.5 py-4">
            <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Go Premium</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
              Unlock exclusive Spaces and live sessions.
            </p>
            <Link
              href={`${base}/subscribe`}
              onClick={onNavigate}
              className="mt-2.5 inline-flex min-h-11 items-center text-[12px] font-semibold text-[#fd5000] transition-colors hover:text-[#e04700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
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
  communityName: _communityName = MOCK_COMMUNITY.name,
  visibility: _visibility = MOCK_COMMUNITY.visibility,
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
    return buildSpaces(
      slug,
      spacesWithRooms,
      workspace?.avatarUrl,
      workspace?.coverUrl
    );
  }, [spacesProp, spacesWithRooms, slug, workspace?.avatarUrl, workspace?.coverUrl]);

  const canCreateSpace = false;
  const communityId = workspace?.communityId ?? null;

  const bodyProps = {
    slug,
    activeNav,
    activeSpaceId,
    spaces,
    canManage: canCreateSpace,
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
        <aside className="fixed inset-y-0 left-0 z-[100] flex w-[min(288px,86vw)] flex-col bg-[var(--color-surface)] shadow-xl lg:hidden">
          <div className="flex items-center justify-end px-3 pt-3">
            <button
              type="button"
              aria-label="Close community menu"
              onClick={onMobileClose}
              className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
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
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <SidebarBody {...bodyProps} />
    </aside>
  );
}
