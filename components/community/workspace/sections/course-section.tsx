"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { useWorkspace } from "@/components/community/workspace-context";
import { HubCard, HubProgressBar, HubSectionTitle } from "@/components/community/hub/hub-ui";
import { EmptyComingSoon } from "../emptyComingSoon";

export function CoursesSection() {
  const { slug, overview } = useWorkspace();
  const courses = overview?.courses ?? [];
  const base = `/c/community/${slug}/courses`;

  if (courses.length === 0) {
    return (
      <EmptyComingSoon
        icon={GraduationCap}
        title="Courses"
        description="Published courses for this community will appear here once creators add them."
        buildPhase="Available"
      />
    );
  }

  return (
    <div className="space-y-4">
      <HubSectionTitle title="Courses" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <HubCard key={course.id}>
            <div className="mb-3 h-24 rounded-md bg-gradient-to-br from-[#fd5000]/20 to-zinc-800" />
            <h3 className="text-sm font-bold">{course.title}</h3>
            <p className="mt-1 text-xs capitalize text-[var(--color-text-muted)]">
              {course.difficulty} · {course.total_lessons} lessons
            </p>
            <HubProgressBar value={course.progress} max={100} className="mt-3" />
            <Link
              href={course.href || base}
              className="mt-3 inline-block text-xs font-semibold text-[#fd5000]"
            >
              Continue learning
            </Link>
          </HubCard>
        ))}
      </div>
    </div>
  );
}
