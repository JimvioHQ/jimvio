"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GraduationCap, Search, ChevronRight, BookOpen } from "lucide-react";
import { HubCard, HubLinkButton } from "@/components/community/hub/hub-ui";
import { cn } from "@/lib/utils";

type HubCourse = {
  id: string;
  title: string;
  description: string | null;
  difficulty: string;
  category?: string | null;
  total_lessons: number;
  total_duration?: number | null;
  progress: number;
  community_name: string;
  community_slug: string;
  href: string;
  price_cents?: number | null;
  currency?: string | null;
  thumbnail_url?: string | null;
  instructor_name?: string | null;
  published_at?: string | null;
};

export default function HubCoursesPage() {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<HubCourse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in-progress" | "completed">("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<"recent" | "title" | "price" | "progress">("progress");
  const [createHref, setCreateHref] = useState<string | null>(null);
  const [viewerAuthenticated, setViewerAuthenticated] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        const qs = params.toString();
        const res = await fetch(`/api/c/courses${qs ? `?${qs}` : ""}`);
        const json = (await res.json().catch(() => ({}))) as {
          courses?: HubCourse[];
          error?: string;
          createHref?: string | null;
          viewerAuthenticated?: boolean;
        };
        if (!res.ok) {
          if (!cancelled) {
            setError(json.error ?? "Could not load courses");
            setCourses([]);
            setCreateHref(typeof json.createHref === "string" ? json.createHref : null);
            setViewerAuthenticated(Boolean(json.viewerAuthenticated));
          }
          return;
        }
        if (!cancelled) {
          setError(null);
          setCourses(json.courses ?? []);
          setCreateHref(typeof json.createHref === "string" ? json.createHref : null);
          setViewerAuthenticated(Boolean(json.viewerAuthenticated));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load courses");
          setCourses([]);
          setViewerAuthenticated(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [searchQuery, reloadKey]);

  const categories = useMemo(() => {
    const values = new Set(courses.map((course) => course.category).filter(Boolean) as string[]);
    return ["all", ...values];
  }, [courses]);

  const filtered = useMemo(() => {
    const rows = courses.filter((course) => {
      const matchesSearch =
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.community_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filter === "all" ||
        (filter === "completed" && course.progress >= 100) ||
        (filter === "in-progress" && course.progress > 0 && course.progress < 100);
      const matchesCategory = category === "all" || course.category === category;
      return matchesSearch && matchesFilter && matchesCategory;
    });
    rows.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "price") return (a.price_cents ?? 0) - (b.price_cents ?? 0);
      if (sort === "recent") {
        const aPublished = a.published_at ? Date.parse(a.published_at) : 0;
        const bPublished = b.published_at ? Date.parse(b.published_at) : 0;
        return bPublished - aPublished || a.title.localeCompare(b.title);
      }
      return b.progress - a.progress;
    });
    return rows;
  }, [courses, searchQuery, filter, category, sort]);

  return (
    <div className="min-h-full bg-[var(--color-bg,#f4f4f5)]">
      <div className="w-full space-y-4 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight">
              <GraduationCap className="h-5 w-5 text-[#fd5000]" />
              Courses
            </h1>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Explore published courses from communities across Jimvio
            </p>
          </div>
          {createHref ? (
            <HubLinkButton href={createHref}>Create course</HubLinkButton>
          ) : null}
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
          <div className="flex flex-wrap gap-2">
            {viewerAuthenticated ? (["all", "in-progress", "completed"] as const).map((key) => (
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
            )) : null}
            <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-semibold">
              {categories.map((item) => <option key={item} value={item}>{item === "all" ? "All categories" : item}</option>)}
            </select>
            <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] font-semibold">
              <option value="progress">Progress</option>
              <option value="title">Title</option>
              <option value="price">Price</option>
              <option value="recent">Recently published</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
            <div className="h-40 animate-pulse rounded-2xl bg-white" />
          </div>
        ) : error ? (
          <HubCard className="py-12 text-center">
            <p className="text-[14px] font-bold">Could not load courses</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{error}</p>
            <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-4 rounded-xl bg-[#fd5000] px-4 py-2 text-[12px] font-semibold text-white">
              Try again
            </button>
          </HubCard>
        ) : filtered.length === 0 ? (
          <HubCard className="py-12 text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-[14px] font-bold">No courses found</p>
            <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
              Published public courses will appear here.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <HubLinkButton href="/communities">Explore communities</HubLinkButton>
              <HubLinkButton href="/creator/courses" variant="secondary">Create a course</HubLinkButton>
            </div>
          </HubCard>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((course) => (
              <Link key={course.id} href={course.href} className="group block h-full">
                <HubCard className="flex h-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] p-0 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#fd5000]/35 hover:shadow-lg">
                  <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-[#1F2937] via-[#374151] to-[#FF5A1F]">
                    {course.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.thumbnail_url} alt={`${course.title} course cover`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                    ) : (
                      <div className="flex h-full items-end justify-between p-4 text-white">
                        <GraduationCap className="h-9 w-9 opacity-90" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Jimvio Learning</span>
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold capitalize text-[#111827] shadow-sm">{course.difficulty}</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#111827]/85 px-3 py-1.5 text-xs font-bold text-white">{course.price_cents && course.price_cents > 0 ? `${course.currency ?? "USD"} ${(course.price_cents / 100).toFixed(2)}` : "Free"}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#fd5000]">{course.community_name}</p>
                    <h2 className="mt-2 line-clamp-2 text-base font-bold leading-snug text-[var(--color-text)] transition-colors group-hover:text-[#fd5000]">{course.title}</h2>
                    {course.description ? <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">{course.description}</p> : <div className="flex-1" />}
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--color-border)] pt-3 text-[11px] font-semibold text-[var(--color-text-muted)]">
                      <span>{course.total_lessons} lessons</span>
                      {course.total_duration ? <span>{course.total_duration} min</span> : null}
                      {course.category ? <span className="truncate">{course.category}</span> : null}
                    </div>
                    {viewerAuthenticated ? (
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-[11px] font-bold">
                          <span className="text-[var(--color-text-muted)]">Your progress</span>
                          <span className="text-[#fd5000]">{course.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]">
                          <div className="h-full rounded-full bg-[#fd5000] transition-all" style={{ width: `${course.progress}%` }} />
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between text-xs font-bold">
                      <span className="text-[var(--color-text-muted)]">{course.instructor_name ? `By ${course.instructor_name}` : "Community course"}</span>
                      <span className="inline-flex items-center gap-1 text-[#fd5000]">Explore course <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
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
