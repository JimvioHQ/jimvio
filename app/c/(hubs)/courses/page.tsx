"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2, CheckCircle2, Clock, Award } from "lucide-react";
import { HubCard, HubBadge, HubLinkButton, HubStatCard, HubSectionTitle } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type Course = {
  id: string;
  community_id: string;
  community_name: string;
  community_slug: string;
  title: string;
  description: string | null;
  difficulty: string;
  total_lessons: number;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
  thumbnail_url: string | null;
  href: string;
};

export default function HubCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/c/courses");
        if (!res.ok) return;
        const json = (await res.json()) as { courses: Course[] };
        if (!cancelled) setCourses(json.courses ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = courses
    .filter((c) => {
      const matchesSearch = c.title.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" || c.status === filter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (b.status === "in_progress" && a.status !== "in_progress") return 1;
      return 0;
    });

  const stats = {
    total: courses.length,
    inProgress: courses.filter(c => c.status === "in_progress").length,
    completed: courses.filter(c => c.status === "completed").length,
    totalLessons: courses.reduce((sum, c) => sum + c.total_lessons, 0),
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-bg)]"
         style={{
           backgroundImage: `radial-gradient(circle at 50% -20%, var(--color-accent)/5, transparent 50%), radial-gradient(circle at 100% 100%, var(--color-berry)/3, transparent 40%)`,
         }}>
      <div className="mx-auto max-w-[960px] space-y-6 p-4 lg:p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              <GraduationCap className="h-5 w-5 text-[var(--color-accent)]" />
              Courses
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Your learning paths across communities
            </p>
          </div>
          <HubLinkButton href="/communities" variant="secondary">
            Browse communities
          </HubLinkButton>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 animate-in stagger-children">
          <HubStatCard label="Total" value={stats.total} icon={<GraduationCap className="h-4 w-4" />} accent="#fd5000" />
          <HubStatCard label="In Progress" value={stats.inProgress} icon={<Clock className="h-4 w-4" />} accent="#4fc3f7" />
          <HubStatCard label="Completed" value={stats.completed} icon={<CheckCircle2 className="h-4 w-4" />} accent="#81c784" />
          <HubStatCard label="Lessons" value={stats.totalLessons} icon={<Award className="h-4 w-4" />} accent="#ffb74d" />
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 sm:flex-row animate-in animate-slide-in-down">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full rounded-xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur py-2.5 pl-10 pr-4 text-[13px] transition-colors focus:border-[var(--color-accent)]/40 focus:outline-none focus:bg-[var(--color-surface)]"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "in_progress", "completed"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-xl px-4 py-2 text-[12px] font-semibold capitalize transition-all",
                  filter === key
                    ? "bg-[var(--color-accent)] text-white shadow-[0_2px_8px_rgba(253,80,0,0.3)]"
                    : "border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/30 hover:bg-[var(--color-surface)]",
                )}
              >
                {key.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur p-8 text-center animate-in animate-fade-in">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)]/10">
              <GraduationCap className="h-7 w-7 text-[var(--color-accent)]" />
            </div>
            <p className="text-[14px] font-bold text-[var(--color-text-primary)]">No courses found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              {search || filter !== "all"
                ? "Try adjusting your search or filter"
                : "No courses yet. Join communities with courses to start learning!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 animate-in stagger-children">
            {filtered.map((course) => (
              <Link key={course.id} href={course.href}>
                <div className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-300 hover-lift",
                  course.status === "completed"
                    ? "border-[var(--color-sage)]/30 bg-gradient-to-br from-[var(--color-sage)]/5 to-transparent"
                    : course.status === "in_progress"
                    ? "border-[var(--color-ocean)]/30 bg-gradient-to-br from-[var(--color-ocean)]/5 to-transparent"
                    : "border-[var(--color-border)]/30 bg-[var(--color-surface)]/50 backdrop-blur"
                )}>
                  <div className="relative">
                    {course.thumbnail_url ? (
                      <img src={course.thumbnail_url} alt="" className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                        <GraduationCap className="h-12 w-12 text-white/20" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <HubBadge variant={course.difficulty === "beginner" ? "default" : course.difficulty === "intermediate" ? "orange" : "live"}>
                        {course.difficulty}
                      </HubBadge>
                      {course.status === "completed" && (
                        <HubBadge variant="sage">Done</HubBadge>
                      )}
                      {course.status === "in_progress" && (
                        <HubBadge variant="ocean">In Progress</HubBadge>
                      )}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-xl">
                      <div className="h-2 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all duration-500"
                             style={{ width: `${course.progress}%`, background: course.status === "completed" ? "var(--color-sage)" : "linear-gradient(90deg, var(--color-sage), var(--color-accent))" }} />
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-white/80">{course.progress}% complete · {course.total_lessons} lessons</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">{course.community_name}</p>
                    <h3 className="mt-1 text-[15px] font-black leading-tight group-hover:text-[var(--color-accent)] transition-colors">{course.title}</h3>
                    {course.description && (
                      <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-text-secondary)]">{course.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {course.total_lessons} lessons</span>
                      <span className="flex items-center gap-1">
                        {course.status === "completed" && (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Completed
                          </>
                        )}
                        {course.status === "in_progress" && (
                          <>
                            <Clock className="h-3 w-3 text-[var(--color-ocean)]" /> Continuing
                          </>
                        )}
                        {course.status === "not_started" && (
                          <>
                            <Award className="h-3 w-3 text-[var(--color-amber)]" /> Not started
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}