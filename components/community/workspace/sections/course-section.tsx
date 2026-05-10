// components/workspace/sections/CoursesSection.tsx

import { GraduationCap } from "lucide-react";
import { EmptyComingSoon } from "../emptyComingSoon";

export function CoursesSection() {
  return (
    <EmptyComingSoon
      icon={GraduationCap}
      title="Courses"
      description="Structured learning paths with video lessons, assignments, and certificates. Members earn XP for completion."
      buildPhase="Phase 2"
    />
  );
}