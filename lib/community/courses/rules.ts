export type CourseAccessMode = "public" | "members" | "private";

export function normalizeAccessMode(value: unknown): CourseAccessMode {
  if (value === "public" || value === "private" || value === "members") return value;
  return "members";
}

export function isCatalogVisible(input: {
  isPublished: boolean;
  archived: boolean;
  accessMode: CourseAccessMode;
  viewerIsMember: boolean;
}): boolean {
  if (!input.isPublished || input.archived) return false;
  if (input.accessMode === "private") return false;
  if (input.accessMode === "public") return true;
  return input.viewerIsMember;
}

/** Free published courses can enroll without a separate purchase. Paid courses never enroll from membership alone. */
export function canAutoEnrollFree(input: {
  isPublished: boolean;
  archived: boolean;
  accessMode: CourseAccessMode;
  isFree: boolean;
  isMember: boolean;
}): boolean {
  if (!input.isFree || !input.isPublished || input.archived) return false;
  if (input.accessMode === "private") return false;
  if (input.accessMode === "members") return input.isMember;
  return true;
}

export function retainsLearningAccess(hasActiveEnrollment: boolean): boolean {
  return hasActiveEnrollment;
}

export type CompletionInput = {
  lessonCount: number;
  completedLessons: number;
  quizIds: string[];
  passedQuizIds: string[];
  requiredAssignmentIds: string[];
  passedAssignmentIds: string[];
};

export function completionSatisfied(input: CompletionInput): { ok: boolean; reason?: string } {
  if (input.lessonCount < 1) {
    return { ok: false, reason: "Course has no lessons" };
  }
  if (input.completedLessons < input.lessonCount) {
    return { ok: false, reason: "Complete all lessons first" };
  }
  const missingQuiz = input.quizIds.some((id) => !input.passedQuizIds.includes(id));
  if (missingQuiz) return { ok: false, reason: "Pass all required quizzes" };
  const missingAssignment = input.requiredAssignmentIds.some(
    (id) => !input.passedAssignmentIds.includes(id)
  );
  if (missingAssignment) {
    return { ok: false, reason: "Complete required assignments" };
  }
  return { ok: true };
}

export function serverPriceCents(value: unknown): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n);
}
