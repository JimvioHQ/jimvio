"use client";

import Link from "next/link";
import {
  BookOpen,
  Check,
  FolderOpen,
  Mic,
  MoreHorizontal,
  Radio,
  Search,
  Target,
} from "lucide-react";
import { AboutCommunityCard } from "@/components/community/AboutCommunityCard";
import { CommunityProgressCard } from "@/components/community/CommunityProgressCard";
import { CommunityRulesCard } from "@/components/community/CommunityRulesCard";
import { CommunityQuickActions } from "@/components/community/CommunityQuickActions";
import { CommunityRightRail } from "@/components/community/CommunityRightRail";
import { CourseCard } from "@/components/community/CourseCard";
import {
  COURSES,
  MOCK_COMMUNITY,
  POPULAR_WEEK,
  RECENT_ACTIVITY,
} from "@/lib/community/dashboard-mock-data";
import { formatNumber, getInitials } from "@/lib/utils";
import { useWorkspace } from "@/components/community/workspace-context";

type CommunityOverviewPageProps = {
  slug: string;
};

const ACTIVITY_BADGE: Record<string, string | null> = {
  live: "LIVE",
  course: null,
  resource: null,
  join: null,
};

const TREND_ICON = {
  Live: Radio,
  Voice: Mic,
  Space: FolderOpen,
  Challenge: Target,
} as const;

function formatMemberCount(count: number): string {
  if (count <= 0) return "";
  if (count >= 10_000) return `${formatNumber(count)} Members`;
  return `${count.toLocaleString()} Members`;
}

export function CommunityOverviewPage({ slug }: CommunityOverviewPageProps) {
  const { communityName, memberCount } = useWorkspace();
  const name = communityName || MOCK_COMMUNITY.name;
  const membersLabel = formatMemberCount(
    memberCount > 0 ? memberCount : MOCK_COMMUNITY.memberCount
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 lg:px-5 lg:py-5">
        {/* Search (reference chrome) */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            placeholder="Search creators, clips, spaces, courses, lives, missions..."
            className="h-11 w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-14 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
            aria-label="Search community"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-flex">
            ⌘K
          </kbd>
        </div>

        <div className="flex gap-5">
          {/* ── Main column ── */}
          <div className="min-w-0 flex-1 space-y-5">
            {/* Hero cover */}
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MOCK_COMMUNITY.bannerUrl}
                alt=""
                className="aspect-[2.6/1] w-full object-cover sm:aspect-[3.2/1]"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5 pt-16 sm:px-7 sm:pb-6">
                <div className="max-w-xl space-y-3">
                  <div className="space-y-1.5">
                    <p className="text-[1.75rem] font-medium tracking-[-0.03em] text-white sm:text-[2rem]">
                      {name}
                    </p>
                    <p className="text-[13px] font-normal tracking-[-0.01em] text-white/75">
                      {MOCK_COMMUNITY.tagline}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {MOCK_COMMUNITY.bannerPills.map((pill) => (
                      <span
                        key={pill}
                        className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-normal text-white/90 backdrop-blur-sm"
                      >
                        {pill}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2.5 pt-0.5">
                    <div className="flex -space-x-2">
                      {["a", "b", "c", "d"].map((s) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={s}
                          src={`https://picsum.photos/seed/member-${s}/48/48`}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover ring-2 ring-black/30"
                        />
                      ))}
                    </div>
                    {membersLabel ? (
                      <span className="text-[12px] font-normal text-white/80">
                        {membersLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-black/30 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-md transition-colors hover:bg-black/45"
              >
                Edit Banner
              </button>
            </div>

            {/* Identity */}
            <div className="rounded-2xl bg-white px-5 py-5 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-medium text-orange-600">
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 space-y-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[1.25rem] font-medium tracking-[-0.025em] text-gray-900 sm:text-[1.35rem]">
                        {name}
                      </h1>
                      {MOCK_COMMUNITY.verified && (
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500"
                          aria-label="Verified"
                        >
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <p className="max-w-xl text-[13px] font-normal leading-relaxed text-gray-500">
                      {MOCK_COMMUNITY.description}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-normal text-gray-400">
                      <span>Created by {MOCK_COMMUNITY.createdBy}</span>
                      <span className="text-gray-300" aria-hidden>
                        ·
                      </span>
                      <span>Joined {MOCK_COMMUNITY.joinedDate}</span>
                      {membersLabel ? (
                        <>
                          <span className="text-gray-300" aria-hidden>
                            ·
                          </span>
                          <span>{membersLabel}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-full bg-orange-500 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-orange-600"
                  >
                    Invite
                  </button>
                  <button
                    type="button"
                    aria-label="More options"
                    className="rounded-full p-2.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            <CommunityQuickActions slug={slug} />

            {/* About / Progress / Rules */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AboutCommunityCard />
              <CommunityProgressCard />
              <CommunityRulesCard />
            </div>

            {/* Courses */}
            <section>
              <div className="mb-3.5 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Courses</h2>
                <Link
                  href={`/communities/${slug}/courses`}
                  className="text-xs font-medium text-orange-500 hover:underline"
                >
                  View all courses
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {COURSES.map((c) => (
                  <CourseCard key={c.id} {...c} />
                ))}
              </div>
            </section>

            {/* Activity + Popular */}
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">
                  Recent Activity in Spaces
                </h3>
                <ul className="space-y-3">
                  {RECENT_ACTIVITY.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {getInitials(a.user)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-gray-800">
                          <span className="font-medium">{a.user}</span> {a.action}
                        </p>
                      </div>
                      {ACTIVITY_BADGE[a.type] && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                          {ACTIVITY_BADGE[a.type]}
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-gray-400">{a.time}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Popular This Week</h3>
                <ul className="space-y-2.5">
                  {POPULAR_WEEK.map((item) => {
                    const Icon = TREND_ICON[item.type as keyof typeof TREND_ICON] ?? BookOpen;
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/communities/${slug}${item.href}`}
                          className="flex items-center gap-2.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-gray-50"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-gray-500">{item.popularity}</p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Right rail ── */}
          <aside className="hidden w-[320px] shrink-0 xl:block 2xl:w-[360px]">
            <div className="sticky top-4">
              <CommunityRightRail showContributors />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
