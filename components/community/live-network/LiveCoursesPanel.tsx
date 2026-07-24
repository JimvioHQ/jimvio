"use client";

import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveCourseSession } from "@/lib/community/live-network";

export function LiveCoursesPanel({
  course,
  className,
}: {
  course: LiveCourseSession;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5",
        className
      )}
      aria-label="Live courses"
    >
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
        <GraduationCap className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden />
        Live courses
      </h3>
      <p className="mt-2 text-[14px] font-bold text-[var(--color-text-primary)]">
        {course.title}
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        {[
          ["Slides", course.slidesShared ? "Shared" : "Ready"],
          ["Whiteboard", course.whiteboardOpen ? "Open" : "Closed"],
          ["Quiz", course.quizActive ? "Live" : "Queued"],
          ["Attendance", String(course.attendance)],
          ["Certificates", course.certificateEligible ? "Eligible" : "Off"],
          ["Recording", course.recordingUrl ? "Ready" : "Capturing"],
        ].map(([label, value]) => (
          <li
            key={label}
            className="rounded-xl border border-[var(--color-border)] px-3 py-2"
          >
            <p className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">
              {label}
            </p>
            <p className="font-semibold text-[var(--color-text-primary)]">{value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
