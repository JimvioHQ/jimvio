import { createServiceRoleClient } from "@/lib/supabase/service-role";

function db() {
  return createServiceRoleClient();
}

/** Course analytics for a community creator / staff. */
export async function getCourseAnalytics(input: {
  communityId?: string;
  creatorId?: string;
}) {
  const client = db();
  let courseQuery = client
    .from("community_courses")
    .select("id, title, price_cents, currency, total_lessons, is_published")
    .is("archived_at", null);
  if (input.communityId) courseQuery = courseQuery.eq("community_id", input.communityId);
  if (input.creatorId) courseQuery = courseQuery.eq("creator_id", input.creatorId);
  const { data: courses } = await courseQuery.limit(200);
  const courseIds = (courses ?? []).map((c) => c.id);
  if (courseIds.length === 0) {
    return {
      enrollments: 0,
      completionRate: 0,
      totalWatchSeconds: 0,
      revenueCents: 0,
      lessonEngagement: 0,
      ratings: null as number | null,
      courses: [] as Array<{
        id: string;
        title: string;
        enrollments: number;
        completionRate: number;
        watchSeconds: number;
      }>,
    };
  }

  const [{ data: enrollments }, { data: progress }] = await Promise.all([
    client
      .from("course_enrollments")
      .select("id, course_id, status, amount_cents, source")
      .in("course_id", courseIds)
      .eq("status", "active"),
    client
      .from("lesson_progress")
      .select("course_id, user_id, is_completed, watch_time")
      .in("course_id", courseIds),
  ]);

  const enrollByCourse = new Map<string, number>();
  let revenueCents = 0;
  for (const row of enrollments ?? []) {
    enrollByCourse.set(row.course_id, (enrollByCourse.get(row.course_id) ?? 0) + 1);
    if (row.source === "purchase") revenueCents += Number(row.amount_cents ?? 0);
  }

  const completedByCourseUser = new Map<string, Set<string>>();
  const learnersByCourse = new Map<string, Set<string>>();
  let totalWatchSeconds = 0;
  let completedLessons = 0;
  for (const row of progress ?? []) {
    totalWatchSeconds += Number(row.watch_time ?? 0);
    if (row.is_completed) completedLessons += 1;
    const learners = learnersByCourse.get(row.course_id) ?? new Set();
    learners.add(row.user_id);
    learnersByCourse.set(row.course_id, learners);
    if (row.is_completed) {
      const key = row.course_id;
      const set = completedByCourseUser.get(key) ?? new Set();
      // track completed lesson counts via separate map would be better; use percent vs total_lessons
      set.add(`${row.user_id}:${row.course_id}`);
      completedByCourseUser.set(key, set);
    }
  }

  const courseStats = (courses ?? []).map((course) => {
    const enrollCount =
      enrollByCourse.get(course.id) ?? learnersByCourse.get(course.id)?.size ?? 0;
    const learners = learnersByCourse.get(course.id)?.size ?? 0;
    const completedLessonRows = (progress ?? []).filter(
      (p) => p.course_id === course.id && p.is_completed
    ).length;
    const expected = Math.max(1, (course.total_lessons ?? 1) * Math.max(1, learners));
    const completionRate = Math.min(
      100,
      Math.round((completedLessonRows / expected) * 100)
    );
    const watchSeconds = (progress ?? [])
      .filter((p) => p.course_id === course.id)
      .reduce((sum, p) => sum + Number(p.watch_time ?? 0), 0);
    return {
      id: course.id,
      title: course.title,
      enrollments: enrollCount,
      completionRate,
      watchSeconds,
    };
  });

  const totalEnrollments = (enrollments ?? []).length;
  const avgCompletion =
    courseStats.length > 0
      ? Math.round(
          courseStats.reduce((sum, c) => sum + c.completionRate, 0) / courseStats.length
        )
      : 0;

  return {
    enrollments: totalEnrollments,
    completionRate: avgCompletion,
    totalWatchSeconds,
    revenueCents,
    lessonEngagement: completedLessons,
    ratings: null as number | null,
    courses: courseStats,
  };
}
