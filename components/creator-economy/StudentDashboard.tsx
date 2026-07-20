"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Course = { courseId: string; course: { title: string; thumbnail_url?: string }; completed: number; lessons: number; percent: number };
export function StudentDashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  useEffect(() => { fetch("/api/creator/courses").then((r) => r.json()).then((d) => setCourses(d.courses ?? [])); }, []);
  return <section className="space-y-4"><div><h1 className="text-xl font-bold text-[var(--color-text-primary)]">Continue learning</h1><p className="text-sm text-[var(--color-text-muted)]">Pick up where you left off.</p></div><div className="grid gap-3 sm:grid-cols-2">{courses.map((item) => <Link key={item.courseId} href={`/creator/courses/${item.courseId}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"><h2 className="font-semibold text-[var(--color-text-primary)]">{item.course?.title}</h2><p className="mt-2 text-sm text-[var(--color-text-muted)]">{item.completed} of {item.lessons} lessons complete</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]"><div className="h-full bg-[#fd5000]" style={{ width: `${item.percent}%` }} /></div></Link>)}</div>{!courses.length && <p className="rounded-xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-text-muted)]">Start a course in a community to see it here.</p>}</section>;
}
