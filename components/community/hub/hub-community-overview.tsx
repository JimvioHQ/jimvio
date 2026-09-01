"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  GraduationCap,
  Home,
  Layers,
  Loader2,
  LogOut,
  MoreHorizontal,
  Newspaper,
  Radio,
  Share2,
  ShoppingBag,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { isMembershipActive } from "@/lib/community-workspace-access";
import {
  hasCapability,
  resolveWorkspaceRole,
} from "@/lib/community/workspace";
import { cn } from "@/lib/utils";
import {
  OverviewCoursesPanel,
  OverviewLivePanel,
  OverviewPostsPanel,
  OverviewSpacesPanel,
  OverviewStorePanel,
} from "@/components/community/hub/overview-section-panels";
import { CommunityOverviewHome } from "@/components/community/hub/community-overview-home";

type OverviewTabId =
  | "overview"
  | "spaces"
  | "courses"
  | "posts"
  | "live"
  | "store";

function formatCompactMembers(n: number) {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (n >= 1000) {
    const v = n / 1000;
    return `${v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return n.toLocaleString();
}

function formatCreatedLabel(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Community Home (Overview) — premium dashboard experience.
 */
export function HubCommunityOverview() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    communityId,
    communityName,
    slug,
    memberCount,
    avatarUrl,
    tagline,
    isPrivate,
    isOwner,
    isAdmin,
    overview,
    spacesWithRooms,
    membership,
    userId,
    ownerId,
    ownerName,
  } = useWorkspace();

  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [joinedMenuOpen, setJoinedMenuOpen] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share");
  const [activeTab, setActiveTab] = useState<OverviewTabId>("overview");
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [muted, setMuted] = useState(false);
  const [localJoined, setLocalJoined] = useState<boolean | null>(null);
  const [localMemberCount, setLocalMemberCount] = useState<number | null>(null);

  const base = `/communities/${slug}`;
  const logo = overview?.avatarUrl ?? avatarUrl;
  const serverMembers = overview?.memberCount ?? memberCount ?? 0;
  const members = localMemberCount ?? serverMembers;
  const communityTagline =
    overview?.tagline?.trim() ||
    tagline?.trim() ||
    "Where creators, brands & opportunities come together.";
  const verified = overview?.isVerified ?? false;
  const createdLabel = formatCreatedLabel(overview?.createdAt);
  const visibilityLabel = isPrivate || overview?.isPrivate ? "Private" : "Public";
  const isFree = overview?.isFree ?? true;

  const serverJoined =
    Boolean(isOwner || isAdmin) || isMembershipActive(membership);
  const isJoined = localJoined ?? serverJoined;
  const memberLabel = `${formatCompactMembers(members)} ${
    members === 1 ? "Member" : "Members"
  }`;

  const publishedCourses =
    overview?.courses?.length
      ? overview.courses
      : overview?.featuredCourse
        ? [overview.featuredCourse]
        : [];
  const liveCount = overview?.liveNow ?? 0;

  const hasSpaces = spacesWithRooms.length > 0;
  const canManage = Boolean(isOwner || isAdmin);
  const canCreateSpace = hasCapability(
    resolveWorkspaceRole({ userId, ownerId, membership }),
    "group.create"
  );
  const onSpacesRoute =
    pathname === `${base}/spaces` || pathname.startsWith(`${base}/spaces/`);

  const secondNav = useMemo(
    () => [
      {
        id: "overview" as const,
        label: "Overview",
        count: null as number | null,
        icon: Home,
        href: base,
      },
      {
        id: "spaces" as const,
        label: "Spaces",
        count: spacesWithRooms.length,
        icon: Layers,
        href: `${base}/spaces`,
      },
      {
        id: "courses" as const,
        label: "Courses",
        count: overview?.courseCount ?? publishedCourses.length,
        icon: GraduationCap,
        href: null as string | null,
      },
      {
        id: "posts" as const,
        label: "Posts",
        count: overview?.postCount ?? null,
        icon: Newspaper,
        href: null as string | null,
      },
      {
        id: "live" as const,
        label: "Live",
        count: liveCount,
        icon: Radio,
        href: null as string | null,
      },
      {
        id: "store" as const,
        label: "Store",
        count: null as number | null,
        icon: ShoppingBag,
        href: null as string | null,
      },
    ],
    [
      base,
      spacesWithRooms.length,
      overview?.courseCount,
      publishedCourses.length,
      overview?.postCount,
      liveCount,
    ]
  );

  async function handleShare() {
    try {
      const url = typeof window !== "undefined" ? window.location.href : base;
      await navigator.clipboard.writeText(url);
      setShareLabel("Copied");
      window.setTimeout(() => setShareLabel("Share"), 1600);
    } catch {
      setShareLabel("Share");
    }
  }

  async function handleJoin() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(base)}`);
      return;
    }
    if (!isFree) {
      router.push(`${base}/subscribe`);
      return;
    }
    if (joining || isJoined) return;

    const prevCount = members;
    setJoining(true);
    setLocalJoined(true);
    setLocalMemberCount(prevCount + 1);

    try {
      const res = await fetch(`/api/communities/${slug}/join`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't join community");
      toast.success(`Welcome to ${communityName}`);
      router.refresh();
    } catch (e) {
      setLocalJoined(false);
      setLocalMemberCount(prevCount);
      toast.error(e instanceof Error ? e.message : "Couldn't join — try again");
    } finally {
      setJoining(false);
    }
  }

  async function handleLeave() {
    if (!userId || isOwner || leaving) return;
    const prevCount = members;
    setLeaving(true);
    setJoinedMenuOpen(false);
    setLocalJoined(false);
    setLocalMemberCount(Math.max(0, prevCount - 1));

    try {
      const res = await fetch(`/api/communities/${slug}/join`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Couldn't leave community");
      toast.success("You left the community");
      router.refresh();
    } catch (e) {
      setLocalJoined(true);
      setLocalMemberCount(prevCount);
      toast.error(e instanceof Error ? e.message : "Couldn't leave — try again");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[var(--color-bg)]">
      {canCreateSpace && communityId ? (
        <CreateSpaceDialog
          open={createSpaceOpen}
          onOpenChange={setCreateSpaceOpen}
          communityId={communityId}
          onCreated={() => router.refresh()}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        {/* Premium community hero */}
        <section className="overflow-hidden rounded-[1.5rem] bg-[var(--color-surface)] shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-[var(--color-border)]">
          <div className="relative overflow-hidden border-b border-[var(--color-border)] bg-[radial-gradient(120%_80%_at_0%_0%,rgba(253,80,0,0.08),transparent_55%),linear-gradient(180deg,var(--color-surface)_0%,var(--color-accent-light)_100%)]">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[#fd5000]/[0.06] blur-3xl" />
            <div className="relative flex flex-col gap-6 px-5 py-7 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-8 sm:py-8 lg:px-9">
              <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[1.35rem] bg-[#fd5000] shadow-[0_12px_28px_rgba(253,80,0,0.22)] ring-[3px] ring-[var(--color-surface)] sm:h-[96px] sm:w-[96px]">
                  {logo ? (
                    <Image
                      src={logo}
                      alt=""
                      fill
                      priority
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                      {communityName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="min-w-0 break-words text-[1.55rem] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.85rem]">
                      {communityName}
                    </h1>
                    {verified ? (
                      <BadgeCheck
                        className="h-5 w-5 shrink-0 text-[#3b82f6]"
                        fill="currentColor"
                        strokeWidth={0}
                        aria-label="Verified community"
                      />
                    ) : null}
                  </div>
                  {communityTagline ? (
                    <p className="mt-1.5 min-w-0 max-w-xl break-words text-[13px] leading-relaxed text-[var(--color-text-muted)] sm:text-[14px]">
                      {communityTagline}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)] ring-1 ring-[var(--color-border)]">
                      {visibilityLabel}
                    </span>
                    {createdLabel ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)]">
                        Created {createdLabel}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                      <Users className="h-3 w-3" aria-hidden />
                      {memberLabel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {isJoined ? (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setJoinedMenuOpen((v) => !v);
                        setMoreOpen(false);
                      }}
                      disabled={leaving}
                      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-200/80 transition-all duration-150 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                      aria-expanded={joinedMenuOpen}
                      aria-haspopup="menu"
                    >
                      {leaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                      )}
                      Joined
                      <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                    </button>
                    {joinedMenuOpen ? (
                      <div className="absolute right-0 z-20 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                          onClick={() => {
                            const next = !muted;
                            const previous = muted;
                            setMuted(next);
                            setJoinedMenuOpen(false);
                            void fetch(`/api/c/${communityId}/mute`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ muted: next }),
                            })
                              .then(async (res) => {
                                if (!res.ok) {
                                  const payload = await res.json().catch(() => null);
                                  throw new Error(payload?.error || "Mute failed");
                                }
                                toast.success(
                                  next
                                    ? "Community notifications muted"
                                    : "Notifications unmuted"
                                );
                              })
                              .catch((err: unknown) => {
                                setMuted(previous);
                                toast.error(
                                  err instanceof Error ? err.message : "Mute failed"
                                );
                              });
                          }}
                        >
                          {muted ? (
                            <Bell className="h-4 w-4" />
                          ) : (
                            <BellOff className="h-4 w-4" />
                          )}
                          {muted ? "Unmute" : "Mute"}
                        </button>
                        <Link
                          href={`${base}/settings`}
                          role="menuitem"
                          className="flex min-h-11 items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                          onClick={() => setJoinedMenuOpen(false)}
                        >
                          <Bell className="h-4 w-4" />
                          Notification Settings
                        </Link>
                        {!isOwner ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
                            onClick={() => void handleLeave()}
                          >
                            <LogOut className="h-4 w-4" />
                            Leave Community
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleJoin()}
                    disabled={joining}
                    aria-busy={joining}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#fd5000] px-5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(253,80,0,0.25)] transition-all duration-150 hover:bg-[#e04700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40 disabled:opacity-70"
                  >
                    {joining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Join Community
                  </button>
                )}
                <Link
                  href={`${base}/members`}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-[13px] font-semibold text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </Link>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                  aria-label={shareLabel}
                  title={shareLabel}
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen((v) => !v);
                      setJoinedMenuOpen(false);
                    }}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] transition-all duration-150 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                    aria-label="More community actions"
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {moreOpen ? (
                    <div className="absolute right-0 z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-1 shadow-lg" role="menu">
                      {canManage ? (
                        <Link
                          href={`/owner/communities/${encodeURIComponent(slug)}`}
                          role="menuitem"
                          className="block min-h-11 px-3.5 py-2.5 text-[13px] font-medium leading-[28px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                          onClick={() => setMoreOpen(false)}
                        >
                          Owner Console
                        </Link>
                      ) : null}
                      <Link
                        href={`${base}/about`}
                        role="menuitem"
                        className="block min-h-11 px-3.5 py-2.5 text-[13px] font-medium leading-[28px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                        onClick={() => setMoreOpen(false)}
                      >
                        About
                      </Link>
                      <Link
                        href={`${base}/members`}
                        role="menuitem"
                        className="block min-h-11 px-3.5 py-2.5 text-[13px] font-medium leading-[28px] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                        onClick={() => setMoreOpen(false)}
                      >
                        Members
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Second navigation — Spaces routes to community spaces index */}
          <nav
            aria-label="Community sections"
            className="flex gap-1 overflow-x-auto px-2 sm:px-4"
          >
            {secondNav.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.id === "spaces"
                  ? onSpacesRoute
                  : item.id === "overview"
                    ? !onSpacesRoute && activeTab === "overview"
                    : !onSpacesRoute && activeTab === item.id;
              const className = cn(
                "relative flex min-h-11 shrink-0 items-center gap-1.5 px-3.5 py-3.5 text-[13px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40",
                isActive
                  ? "font-semibold text-[#fd5000]"
                  : "font-medium text-gray-500 hover:text-gray-800"
              );
              const content = (
                <>
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.count != null && item.count > 0 ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                        isActive
                          ? "bg-[#fd5000]/10 text-[#fd5000]"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                  {isActive ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#fd5000]" />
                  ) : null}
                </>
              );

              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={className}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => {
                      if (item.id === "overview") setActiveTab("overview");
                    }}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={className}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </section>

        {activeTab === "overview" ? (
          <>
            <CommunityOverviewHome
              slug={slug}
              communityName={communityName}
              base={base}
              overview={overview}
              spacesWithRooms={spacesWithRooms}
              canManage={canCreateSpace}
              onCreateSpace={() => setCreateSpaceOpen(true)}
            />

            {!hasSpaces ? (
              <section className="mt-4 overflow-hidden rounded-[1.35rem] bg-[var(--color-surface)] p-6 shadow-[0_8px_30px_rgba(15,23,42,0.04)] ring-1 ring-[var(--color-border)] sm:p-8 animate-in fade-in duration-300">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fd5000]/10 text-[#fd5000]">
                      <Layers className="h-6 w-6" aria-hidden />
                    </span>
                    {canCreateSpace ? (
                      <>
                        <div>
                          <h2 className="min-w-0 break-words text-[1.35rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                            Welcome to your new Community
                          </h2>
                          <p className="mt-2 max-w-xl break-words text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                            Create your first Space to organize members for discussion,
                            resources, and live sessions.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setCreateSpaceOpen(true)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#fd5000] px-5 text-[13px] font-semibold text-white hover:bg-[#e04700] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                          >
                            Create First Space
                          </button>
                          <Link
                            href={`/owner/communities/${encodeURIComponent(slug)}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 text-[13px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fd5000]/40"
                          >
                            Owner Console
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h2 className="min-w-0 break-words text-[1.35rem] font-semibold tracking-tight text-[var(--color-text-primary)]">
                            No spaces available yet.
                          </h2>
                          <p className="mt-2 max-w-xl break-words text-[14px] leading-relaxed text-[var(--color-text-muted)]">
                            No Spaces have been published yet. Check back soon — your host
                            is setting things up.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <div className="mt-8 animate-in fade-in duration-300">
            {activeTab === "spaces" ? (
              <OverviewSpacesPanel
                slug={slug}
                spaces={spacesWithRooms}
                canManage={canCreateSpace}
                onCreateSpace={() => setCreateSpaceOpen(true)}
              />
            ) : null}
            {activeTab === "courses" ? (
              <OverviewCoursesPanel
                courses={publishedCourses}
                ownerName={ownerName}
              />
            ) : null}
            {activeTab === "posts" ? (
              <OverviewPostsPanel communityId={communityId} slug={slug} />
            ) : null}
            {activeTab === "live" ? (
              <OverviewLivePanel
                slug={slug}
                activeLiveSession={overview?.activeLiveSession ?? null}
                liveNow={liveCount}
              />
            ) : null}
            {activeTab === "store" ? (
              <OverviewStorePanel communityId={communityId} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
