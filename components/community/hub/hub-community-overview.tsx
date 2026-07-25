"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  BellOff,
  Calendar,
  Check,
  ChevronDown,
  Eye,
  FileText,
  GraduationCap,
  Home,
  Layers,
  Loader2,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Radio,
  Share2,
  ShoppingBag,
  Target,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/community/workspace-context";
import { CreateSpaceDialog } from "@/components/community/CreateSpaceDialog";
import { isMembershipActive } from "@/lib/community-workspace-access";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  OverviewCoursesPanel,
  OverviewEventsPanel,
  OverviewLivePanel,
  OverviewSpacesPanel,
  OverviewStorePanel,
} from "@/components/community/hub/overview-section-panels";

type OverviewTabId =
  | "overview"
  | "spaces"
  | "courses"
  | "events"
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

function relativeTime(iso: string | null | undefined) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function padBullets(source: string[], fallbacks: string[], limit = 4) {
  const cleaned = source.map((s) => s.trim()).filter(Boolean);
  const out = [...cleaned];
  for (const f of fallbacks) {
    if (out.length >= limit) break;
    if (!out.includes(f)) out.push(f);
  }
  return out.slice(0, limit);
}

const ANNOUNCEMENT_COLORS = [
  "bg-rose-500",
  "bg-violet-500",
  "bg-emerald-500",
] as const;

/**
 * Community Home (Overview) — matches approved design reference.
 * Full-width Description → Mission → Vision → Announcements rows.
 */
export function HubCommunityOverview() {
  const router = useRouter();
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
  const desc =
    overview?.description?.trim() ||
    `A place for people who care about ${communityName} — learning, sharing, and building together.`;
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

  const mission =
    overview?.missionVision?.mission?.trim() ||
    communityTagline ||
    `Help members of ${communityName} learn faster and collaborate with clarity.`;
  const vision =
    overview?.missionVision?.vision?.trim() ||
    (overview?.category
      ? `Become the go-to home for ${overview.category.toLowerCase()} creators who want to learn, contribute, and grow together.`
      : `Build a trusted ecosystem where members of ${communityName} turn knowledge into impact.`);

  const tags = overview?.tags ?? [];
  const descriptionBullets = padBullets(tags, [
    "Global creator & affiliate network",
    "Exclusive resources & opportunities",
    "Live sessions with industry experts",
    "Cross-border collaboration",
  ]);
  const missionBullets = padBullets(
    (overview?.trustedBadges ?? [])
      .filter((b) => b.tone === "active" || b.tone === "learning")
      .map((b) => b.label),
    ["Empower creators", "Build connections", "Unlock opportunities", "Grow together"]
  );
  const visionBullets = padBullets(
    (overview?.trustedBadges ?? [])
      .filter((b) => b.tone === "featured" || b.tone === "verified" || b.tone === "secure")
      .map((b) => b.label),
    [
      "A borderless creator economy",
      "Trusted by brands worldwide",
      "Innovation-first platform",
      "Inclusive by design",
    ]
  );

  const announcements = (overview?.featuredPosts ?? []).slice(0, 3);
  const publishedCourses =
    overview?.courses?.length
      ? overview.courses
      : overview?.featuredCourse
        ? [overview.featuredCourse]
        : [];
  const upcomingEvents = overview?.upcomingEvents ?? [];
  const liveCount = overview?.liveNow ?? 0;

  const hasSpaces = spacesWithRooms.length > 0;
  const canManage = Boolean(isOwner || isAdmin);

  const secondNav = useMemo(
    () => [
      {
        id: "overview" as const,
        label: "Overview",
        count: null as number | null,
        icon: Home,
      },
      {
        id: "spaces" as const,
        label: "Spaces",
        count: spacesWithRooms.length,
        icon: Layers,
      },
      {
        id: "courses" as const,
        label: "Courses",
        count: overview?.courseCount ?? publishedCourses.length,
        icon: GraduationCap,
      },
      {
        id: "events" as const,
        label: "Events",
        count: upcomingEvents.length,
        icon: Calendar,
      },
      {
        id: "live" as const,
        label: "Live",
        count: liveCount,
        icon: Radio,
      },
      {
        id: "store" as const,
        label: "Store",
        count: null as number | null,
        icon: ShoppingBag,
      },
    ],
    [
      spacesWithRooms.length,
      overview?.courseCount,
      publishedCourses.length,
      upcomingEvents.length,
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
    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#f9fafb]">
      {canManage && communityId ? (
        <CreateSpaceDialog
          open={createSpaceOpen}
          onOpenChange={setCreateSpaceOpen}
          communityId={communityId}
          onCreated={() => router.refresh()}
        />
      ) : null}

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 sm:px-6 lg:px-8">
        {/* Community header — no cover */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100">
          <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-7 sm:py-7 lg:px-8">
            <div className="flex min-w-0 items-center gap-4 sm:gap-5">
              <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[#fd5000] shadow-sm sm:h-20 sm:w-20">
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
                  <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-white">
                    {communityName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-[1.4rem] font-semibold tracking-tight text-gray-900 sm:text-[1.65rem]">
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
                <p className="mt-1 text-[13px] text-gray-500">
                  {visibilityLabel} Community
                  {createdLabel ? (
                    <>
                      <span className="mx-1.5 text-gray-300">·</span>
                      Created {createdLabel}
                    </>
                  ) : null}
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span className="font-medium text-[#3b82f6]">{memberLabel}</span>
                </p>
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
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-4 text-[13px] font-semibold text-emerald-700 ring-1 ring-emerald-200/80 transition-all duration-150 hover:bg-emerald-100"
                    aria-expanded={joinedMenuOpen}
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
                    <div className="absolute right-0 z-20 mt-1.5 min-w-[200px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => {
                          setMuted((v) => !v);
                          setJoinedMenuOpen(false);
                          toast.success(
                            muted
                              ? "Notifications unmuted"
                              : "Community notifications muted"
                          );
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
                        className="flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
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
                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#fd5000] px-4 text-[13px] font-semibold text-white transition-all duration-150 hover:bg-[#e04700] hover:shadow-sm disabled:opacity-70"
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Join Community
                </button>
              )}
              <Link
                href={`${base}/members`}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] font-semibold text-gray-700 transition-all duration-150 hover:bg-gray-50 hover:border-gray-300"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:border-gray-300"
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
                    className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all duration-150 hover:bg-gray-50 hover:border-gray-300"
                    aria-label="More"
                    aria-expanded={moreOpen}
                  >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {moreOpen ? (
                  <div className="absolute right-0 z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
                    {canManage ? (
                      <Link
                        href={`/dashboard/communities/${encodeURIComponent(slug)}`}
                        className="block px-3.5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                        onClick={() => setMoreOpen(false)}
                      >
                        Owner Console
                      </Link>
                    ) : null}
                    <Link
                      href={`${base}/about`}
                      className="block px-3.5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setMoreOpen(false)}
                    >
                      About
                    </Link>
                    <Link
                      href={`${base}/members`}
                      className="block px-3.5 py-2.5 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                      onClick={() => setMoreOpen(false)}
                    >
                      Members
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Second navigation — in-page tabs */}
          <nav
            aria-label="Community sections"
            className="flex gap-1 overflow-x-auto border-t border-gray-100 px-2 sm:px-4"
          >
            {secondNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative flex shrink-0 items-center gap-1.5 px-3.5 py-3.5 text-[13px] transition-colors duration-150",
                    isActive
                      ? "font-semibold text-[#fd5000]"
                      : "font-medium text-gray-500 hover:text-gray-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {item.count != null && item.count > 0 ? (
                    <span
                      className={cn(
                        "text-[12px]",
                        isActive ? "text-[#fd5000]/80" : "text-gray-400"
                      )}
                    >
                      ({item.count})
                    </span>
                  ) : null}
                  {isActive ? (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#fd5000]" />
                  ) : null}
                </button>
              );
            })}
          </nav>
        </section>

        {activeTab === "overview" ? (
          <>
            {/* Empty foundation state */}
            {!hasSpaces ? (
              <section className="mt-8 overflow-hidden rounded-2xl bg-white p-8 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 sm:p-10">
                <div className="grid grid-cols-12 gap-6">
                  <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fd5000]/10 text-[#fd5000]">
                      <Layers className="h-6 w-6" aria-hidden />
                    </span>
                    {canManage ? (
                      <>
                        <div>
                          <h2 className="text-[1.35rem] font-semibold tracking-tight text-gray-900">
                            Welcome to your new Community
                          </h2>
                          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-gray-500">
                            Create your first Space to organize members for discussion,
                            resources, and live sessions.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => setCreateSpaceOpen(true)}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#fd5000] px-5 text-[13px] font-semibold text-white hover:bg-[#e04700]"
                          >
                            Create your first Space
                          </button>
                          <Link
                            href={`/dashboard/communities/${encodeURIComponent(slug)}`}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Owner Console
                          </Link>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <h2 className="text-[1.35rem] font-semibold tracking-tight text-gray-900">
                            This community is being prepared
                          </h2>
                          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-gray-500">
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

            {/* Overview content — full-width rows */}
            <div className="mt-10 space-y-10 sm:mt-12 sm:space-y-12">
              <OverviewRow
                icon={FileText}
                iconClass="bg-orange-50 text-[#fd5000]"
                bulletClass="text-[#fd5000]"
                BulletIcon={Check}
                title="Description"
                body={desc}
                bullets={descriptionBullets}
              />

              <OverviewRow
                icon={Target}
                iconClass="bg-emerald-50 text-emerald-600"
                bulletClass="text-emerald-600"
                BulletIcon={Check}
                title="Mission"
                body={mission}
                bullets={missionBullets}
              />

              <OverviewRow
                icon={Eye}
                iconClass="bg-sky-50 text-sky-600"
                bulletClass="text-sky-600"
                BulletIcon={Check}
                title="Vision"
                body={vision}
                bullets={visionBullets}
              />

              <section>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                      <Megaphone className="h-5 w-5" aria-hidden />
                    </span>
                    <h2 className="text-[1.15rem] font-semibold tracking-tight text-gray-900">
                      Announcements
                    </h2>
                  </div>
                  <Link
                    href={`${base}/feed`}
                    className="text-[13px] font-semibold text-[#fd5000] hover:underline"
                  >
                    View all announcements →
                  </Link>
                </div>

                {announcements.length === 0 ? (
                  <div className="rounded-2xl bg-white px-5 py-8 text-center text-[14px] text-gray-500 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100">
                    No announcements yet.
                  </div>
                ) : (
                  <ul className="grid grid-cols-12 gap-4">
                    {announcements.map((post, index) => (
                      <li
                        key={post.id}
                        className="col-span-12 sm:col-span-6 lg:col-span-4"
                      >
                        <Link
                          href={post.href}
                          className="flex h-full gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <span
                            className={cn(
                              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white",
                              ANNOUNCEMENT_COLORS[index % ANNOUNCEMENT_COLORS.length]
                            )}
                          >
                            <Megaphone className="h-5 w-5" aria-hidden />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="line-clamp-2 text-[14px] font-semibold text-gray-900">
                                {post.title?.trim() || post.body.slice(0, 72)}
                              </span>
                              {index === 1 && liveCount > 0 ? (
                                <span className="shrink-0 rounded-md bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                  Live
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-gray-500">
                              {post.body}
                            </span>
                            <span className="mt-2 block text-[11px] text-gray-400">
                              {post.author.name}
                              <span className="mx-1">·</span>
                              {relativeTime(post.created_at)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        ) : (
          <div className="mt-8">
            {activeTab === "spaces" ? (
              <OverviewSpacesPanel slug={slug} spaces={spacesWithRooms} />
            ) : null}
            {activeTab === "courses" ? (
              <OverviewCoursesPanel
                courses={publishedCourses}
                ownerName={ownerName}
              />
            ) : null}
            {activeTab === "events" ? (
              <OverviewEventsPanel
                slug={slug}
                communityId={communityId}
                upcomingEvents={upcomingEvents}
              />
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

function OverviewRow({
  icon: Icon,
  iconClass,
  bulletClass,
  BulletIcon,
  title,
  body,
  bullets,
}: {
  icon: typeof FileText;
  iconClass: string;
  bulletClass: string;
  BulletIcon: typeof Check;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <section className="flex gap-4 sm:gap-5">
      <span
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          iconClass
        )}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[1.15rem] font-semibold tracking-tight text-gray-900">
          {title}
        </h2>
        <p className="mt-2.5 max-w-3xl text-[14px] leading-relaxed text-gray-600 sm:text-[15px]">
          {body}
        </p>
        {bullets.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2.5">
            {bullets.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-2 text-[13px] text-gray-700"
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full",
                    bulletClass.includes("emerald")
                      ? "bg-emerald-100"
                      : bulletClass.includes("sky")
                        ? "bg-sky-100"
                        : "bg-orange-100"
                  )}
                >
                  <BulletIcon
                    className={cn("h-3 w-3", bulletClass)}
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
