"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatCard } from "@/components/shell/StatCard";
import { AboutCommunityCard } from "@/components/community/AboutCommunityCard";
import { CommunityProgressCard } from "@/components/community/CommunityProgressCard";
import { CommunityRulesCard } from "@/components/community/CommunityRulesCard";
import { CommunityQuickActions } from "@/components/community/CommunityQuickActions";
import { CommunityRightRail } from "@/components/community/CommunityRightRail";
import { CourseCard } from "@/components/community/CourseCard";
import { CommunitySidebar } from "@/components/shell/CommunitySidebar";
import {
  COURSES,
  MOCK_COMMUNITY,
  OVERVIEW_STATS,
  POPULAR_WEEK,
  RECENT_ACTIVITY,
} from "@/lib/community/dashboard-mock-data";
import { getInitials } from "@/lib/utils";
import { Users, Radio, Mic, GraduationCap, DollarSign } from "lucide-react";

type CommunityOverviewPageProps = {
  slug: string;
};

const STAT_ICONS = [Users, Radio, Mic, GraduationCap, DollarSign];

export function CommunityOverviewPage({ slug }: CommunityOverviewPageProps) {
  const xpPct = Math.round((MOCK_COMMUNITY.xp / MOCK_COMMUNITY.xpGoal) * 100);

  return (
    <div className="flex min-h-0 flex-1 bg-gray-50">
      <CommunitySidebar slug={slug} activeNav="overview" />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-[1600px] gap-5 p-4 lg:p-5">
          <div className="min-w-0 flex-1 space-y-4">
            <div className="relative overflow-hidden rounded-xl">
              <img src={MOCK_COMMUNITY.bannerUrl} alt="" className="aspect-[3/1] w-full object-cover" />
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/55"
              >
                Edit Banner
              </button>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-sm font-semibold text-green-700">
                  {MOCK_COMMUNITY.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold text-gray-900">{MOCK_COMMUNITY.name}</h1>
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                      {MOCK_COMMUNITY.visibility}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Created by {MOCK_COMMUNITY.createdBy} · Joined {MOCK_COMMUNITY.joinedDate}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-orange-500">Level {MOCK_COMMUNITY.level}</span>
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${xpPct}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                  Invite
                </button>
                <button type="button" aria-label="More" className="text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
            </div>

            <CommunityQuickActions slug={slug} />

            <div className="grid grid-cols-12 gap-3">
              {OVERVIEW_STATS.map((stat, i) => {
                const Icon = STAT_ICONS[i] ?? Users;
                return (
                  <StatCard
                    key={stat.label}
                    className={i === 4 ? "col-span-12 sm:col-span-6 lg:col-span-4" : "col-span-6 sm:col-span-4 lg:col-span-2"}
                    icon={<Icon className="h-3.5 w-3.5 text-gray-500" />}
                    value={stat.value}
                    label={stat.label}
                    delta={stat.delta}
                  />
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <AboutCommunityCard />
              <CommunityProgressCard />
              <CommunityRulesCard />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Courses</h2>
                <Link href={`/c/${slug}/courses`} className="text-xs font-medium text-orange-500 hover:underline">
                  View all courses
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
                {COURSES.map((c) => (
                  <CourseCard key={c.id} {...c} />
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Recent Activity in Spaces</h3>
                <ul className="space-y-3">
                  {RECENT_ACTIVITY.map((a) => (
                    <li key={a.id} className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                        {getInitials(a.user)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-800">
                          <span className="font-medium">{a.user}</span> {a.action}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-gray-400">{a.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Popular This Week</h3>
                <ul className="space-y-2.5">
                  {POPULAR_WEEK.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-800">{p.title}</span>
                      <span className="shrink-0 text-xs text-gray-500">{p.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <aside className="hidden w-[360px] shrink-0 xl:block">
            <CommunityRightRail showContributors />
          </aside>
        </div>
      </div>
    </div>
  );
}
