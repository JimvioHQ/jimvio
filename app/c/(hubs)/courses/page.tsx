"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Loader2, Search, ChevronRight, BookOpen } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type HubCourse = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_lessons: number;
  progress: number;
  community_name: string;
  community_slug: string;
  href: string;
};

export default function HubCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<HubCourse[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/courses");
        if (!res.ok) return;
        const json = (await res.json()) as { courses: HubCourse[] };
        if (!cancelled) setCourses(json.courses ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    return courses
      .filter((course) => {
        const matchesSearch =
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.community_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
          filter === "all" ||
          (filter === "completed" && course.progress >= 100) ||
          (filter === "in-progress" && course.progress > 0 && course.progress < 100);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.progress - a.progress);
  }, [courses, searchQuery, filter]);

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="mx-auto max-w-[960px] space-y-4 p-4 lg:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <GraduationCap className="h-5 w-5 text-[#fd5000]" />
              Courses
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Learn from your joined communities
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Browse communities
          </HubLinkButton>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-[13px] focus:border-[#fd5000]/40 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "in-progress", "completed"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors",
                  filter === key
                    ? "bg-[#fd5000] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[#fd5000]/30"
                )}
              >
                {key === "in-progress" ? "In progress" : key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <HubCard className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No courses found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Published courses from your communities will appear here.
            </p>
          </HubCard>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((course) => (
              <Link key={course.id} href={course.href}>
                <HubCard className="group flex h-full flex-col transition hover:border-[#fd5000]/30 hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {course.community_name}
                      </p>
                      <h2 className="mt-0.5 line-clamp-2 text-[14px] font-bold group-hover:text-[#fd5000]">
                        {course.title}
                      </h2>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 group-hover:text-[#fd5000]" />
                  </div>
                  {course.description && (
                    <p className="mt-2 line-clamp-2 flex-1 text-[12px] text-[var(--color-text-secondary)]">
                      {course.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-[var(--color-text-muted)]">
                    <span className="capitalize">{course.difficulty}</span>
                    <span>{course.total_lessons} lessons</span>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[10px] font-bold">
                      <span className="text-[var(--color-text-muted)]">Progress</span>
                      <span className="text-[#fd5000]">{course.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                      <div
                        className="h-full rounded-full bg-[#fd5000] transition-all"
                        style={{ width: `${course.progress}%` }}
                      />
                    </div>
                  </div>
                </HubCard>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
