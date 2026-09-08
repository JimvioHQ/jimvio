"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Home, Layers, Plus, ShieldCheck, X } from "lucide-react";
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
import { manageCommunityHref } from "@/lib/community/owner-console";
import { createClient } from "@/lib/supabase/client";
import { safeMediaUrl } from "@/lib/media/optimize-url";
import { SpaceAvatar } from "@/components/community/workspace/space/SpaceAvatar";
import {
  formatMemberCountLabel,
  resolveCommunityMemberCount,
  resolveSpaceMemberCount,
} from "@/lib/community/member-count";

type CommunityNavItem = "overview" | "spaces";

type SpaceItem = {
  id: string;
  label: string;
  href: string;
  slug?: string;
  memberCount?: number;
  iconColor?: string;
  iconUrl?: string | null;
  icon?: string | null;
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
  return formatMemberCountLabel(count, { compact: true });
}

function buildSpaces(
  communitySlug: string,
  spacesWithRooms: WorkspaceSpaceRow[],
  communityAvatar?: string | null,
  communityCover?: string | null
): SpaceItem[] {
  const primary = resolvePrimarySpace(spacesWithRooms);
  const list = primary
    ? [primary, ...spacesWithRooms.filter((s) => s.id !== primary.id)]
    : spacesWithRooms;
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
    icon:
      space.icon && !/^https?:\/\//i.test(space.icon) ? space.icon : null,
    iconUrl:
      safeMediaUrl(
        resolveSpaceAvatarSrc(space, communityAvatar, communityCover) ?? undefined,
        96
      ) ?? null,
  }));
}

function SidebarBody({
  slug,
  activeSpaceId,
  spaces,
  spacesStatus,
  canManage,
  communityId,
  onNavigate,
}: {
  slug: string;
  activeNav?: CommunityNavItem;
  activeSpaceId?: string;
  spaces: SpaceItem[];
  spacesStatus: "loading" | "ready" | "error";
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--color-border)] px-4 pb-2.5 pt-2">
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
          {spacesStatus === "loading" ? (
            <p className="px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              Loading spaces…
            </p>
          ) : spacesStatus === "error" ? (
            <p className="px-3 py-2 text-[12px] leading-relaxed text-[var(--color-text-muted)]">
              Couldn’t load spaces. Try again.
            </p>
          ) : spaces.length === 0 ? (
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
                  <SpaceAvatar
                    name={space.label}
                    src={space.iconUrl}
                    icon={space.icon}
                    size={32}
                    className={cn(!space.iconUrl && !space.icon && color)}
                  />
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
                      {formatMemberCount(count)}
                    </span>
                  </span>
                </Link>
              );
            })
          )}
        </nav>
      </div>

      <div className="mt-auto border-t border-[var(--color-border)] px-3 py-3">
        <Link
          href={manageCommunityHref(slug)}
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          COMMUNITY MANAGER
        </Link>
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
    </div>
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
  const [fetchedSpaces, setFetchedSpaces] = useState<WorkspaceSpaceRow[]>([]);
  const [spacesStatus, setSpacesStatus] = useState<"loading" | "ready" | "error">(
    spacesProp !== undefined || spacesWithRooms.length > 0 ? "ready" : "loading"
  );

  const shouldResolveSpaces = mobileOpen === undefined || mobileOpen === true;

  useEffect(() => {
    if (spacesProp !== undefined) {
      setSpacesStatus("ready");
      return;
    }
    if (spacesWithRooms.length > 0) {
      setFetchedSpaces([]);
      setSpacesStatus("ready");
      return;
    }
    if (!shouldResolveSpaces) return;

    let cancelled = false;
    setSpacesStatus("loading");
    (async () => {
      try {
        const supabase = createClient();
        const { data: community, error: communityError } = await supabase
          .from("communities")
          .select("id, slug, avatar_url, cover_image, member_count, settings")
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();
        if (cancelled) return;
        if (communityError || !community) {
          setFetchedSpaces([]);
          setSpacesStatus(communityError ? "error" : "ready");
          return;
        }
        const communityCount = resolveCommunityMemberCount({
          slug: community.slug,
          member_count: community.member_count,
          settings: (community as { settings?: unknown }).settings,
        });
        const { data, error } = await supabase
          .from("spaces")
          .select(
            "id, name, slug, icon, description, access_type, sort_order, space_type, created_at, is_featured, member_count, cover_url, banner_url"
          )
          .eq("community_id", community.id)
          .eq("is_active", true)
          .order("sort_order");
        if (cancelled) return;
        if (error) {
          setFetchedSpaces([]);
          setSpacesStatus("error");
          return;
        }
        setFetchedSpaces(
          (data ?? []).map((s: {
            id: string;
            name: string;
            slug: string;
            icon: string | null;
            description: string | null;
            access_type: string | null;
            sort_order: number | null;
            space_type: string | null;
            created_at: string | null;
            is_featured: boolean | null;
            member_count: number | null;
            cover_url?: string | null;
            banner_url?: string | null;
          }) => ({
            id: s.id,
            name: s.name,
            slug: s.slug,
            icon: s.icon,
            color: null,
            description: s.description ?? null,
            access_type: s.access_type ?? "free",
            sort_order: s.sort_order,
            space_type: s.space_type ?? "discussion",
            created_at: s.created_at ?? null,
            is_featured: s.is_featured ?? null,
            cover_url: s.cover_url ?? null,
            banner_url: s.banner_url ?? null,
            member_count: resolveSpaceMemberCount(
              {
                access_type: s.access_type ?? "free",
                member_count: s.member_count,
              },
              communityCount
            ),
            rooms: [],
          }))
        );
        setSpacesStatus("ready");
      } catch {
        if (!cancelled) {
          setFetchedSpaces([]);
          setSpacesStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, spacesProp, spacesWithRooms.length, shouldResolveSpaces]);

  const sourceSpaces = spacesWithRooms.length > 0 ? spacesWithRooms : fetchedSpaces;

  const spaces = useMemo(() => {
    if (spacesProp !== undefined) return spacesProp;
    return buildSpaces(
      slug,
      sourceSpaces,
      workspace?.avatarUrl,
      workspace?.coverUrl
    );
  }, [spacesProp, sourceSpaces, slug, workspace?.avatarUrl, workspace?.coverUrl]);

  const canCreateSpace = Boolean(workspace?.isOwner || workspace?.isAdmin);
  const communityId = workspace?.communityId ?? null;

  const bodyProps = {
    slug,
    activeNav,
    activeSpaceId,
    spaces,
    spacesStatus: spacesProp !== undefined ? ("ready" as const) : spacesStatus,
    canManage: canCreateSpace,
    communityId,
  };

  if (mobileOpen !== undefined) {
    // Always-mounted drawer — CSS open only (no cold mount on hamburger).
    return (
      <div
        className={cn(
          "fixed inset-0 z-[110] lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close community menu"
          tabIndex={mobileOpen ? 0 : -1}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-150",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={onMobileClose}
        />
        <aside
          className={cn(
            "absolute bottom-0 left-0 top-0 flex w-[min(288px,86vw)] flex-col bg-[var(--color-surface)] shadow-xl transition-transform duration-150 ease-out pt-[max(0.5rem,env(safe-area-inset-top))] pb-[env(safe-area-inset-bottom)]",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          role="dialog"
          aria-modal={mobileOpen}
          aria-label="Community menu"
        >
          <div className="flex shrink-0 items-center justify-end px-3">
            <button
              type="button"
              aria-label="Close community menu"
              tabIndex={mobileOpen ? 0 : -1}
              onClick={onMobileClose}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SidebarBody {...bodyProps} onNavigate={onMobileClose} />
        </aside>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      <SidebarBody {...bodyProps} />
    </aside>
  );
}
