import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { safeHttpUrl } from "@/lib/community/courses/rules";

function db() { return createServiceRoleClient(); }

async function assertCreator(courseId: string, userId: string) {
  const { data, error } = await db().from("community_courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Forbidden");
  const { assertCourseManager } = await import("@/lib/community/courses/manage");
  await assertCourseManager(userId, data.community_id);
  return data;
}

export async function upsertModule(input: { userId: string; courseId: string; id?: string; title: string; description?: string; sortOrder?: number; isFree?: boolean }) {
  await assertCreator(input.courseId, input.userId);
  const payload = { course_id: input.courseId, title: input.title, description: input.description ?? null, sort_order: input.sortOrder ?? 0, is_free: Boolean(input.isFree) };
  const query = input.id
    ? db().from("course_modules").update(payload).eq("id", input.id).eq("course_id", input.courseId)
    : db().from("course_modules").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function upsertLesson(input: { userId: string; courseId: string; moduleId: string; id?: string; title: string; body?: string; videoUrl?: string; duration?: number; sortOrder?: number; isFree?: boolean; attachments?: unknown[] }) {
  await assertCreator(input.courseId, input.userId);
  const { data: moduleRow } = await db()
    .from("course_modules")
    .select("id")
    .eq("id", input.moduleId)
    .eq("course_id", input.courseId)
    .maybeSingle();
  if (!moduleRow) throw new Error("Module not found");
  const videoUrl = input.videoUrl?.trim() ? safeHttpUrl(input.videoUrl) : null;
  if (input.videoUrl?.trim() && !videoUrl) throw new Error("Video URL must be http or https");
  const attachments = (input.attachments ?? []).map((item) => {
    const record = item && typeof item === "object" ? (item as Record<string, unknown>) : null;
    const url = safeHttpUrl(record?.url);
    if (!url) throw new Error("Resource URL must be http or https");
    return { ...record, url };
  });
  const payload = { course_id: input.courseId, module_id: input.moduleId, title: input.title, body: input.body ?? null, video_url: videoUrl, duration: input.duration ?? 0, sort_order: input.sortOrder ?? 0, is_free: Boolean(input.isFree), attachments };
  const query = input.id
    ? db().from("course_lessons").update(payload).eq("id", input.id).eq("course_id", input.courseId)
    : db().from("course_lessons").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function listCourseTree(courseId: string, userId?: string) {
  const client = db();
  const { data: course, error } = await client.from("community_courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw error;
  if (!course) throw new Error("Course not found");
  let isManager = false;
  if (userId) {
    try {
      const { assertCourseManager } = await import("@/lib/community/courses/manage");
      await assertCourseManager(userId, course.community_id);
      isManager = true;
    } catch {
      isManager = false;
    }
  }
  const { canOpenCourseTree } = await import("@/lib/community/courses/rules");
  if (
    !canOpenCourseTree({
      isPublished: Boolean(course.is_published),
      archived: Boolean(course.archived_at),
      isCreator: course.creator_id === userId,
      isManager,
    })
  ) {
    throw new Error(course.archived_at ? "Course is archived" : "Course is not published");
  }

  let fullContent = course.creator_id === userId || isManager;
  const { assertCourseAccess, redactCourseTreeForAccess } = await import("@/lib/community/courses/access");
  // Signed-in learners: full lesson content only with valid access (staff or active enrollment).
  // Anonymous visitors never get it. Free lessons stay previewable for everyone (redaction keeps them).
  if (!fullContent && userId) {
    const access = await assertCourseAccess({
      userId,
      roomId: course.room_id ?? "",
      courseId: course.id,
      communityId: course.community_id,
      creatorId: course.creator_id,
      priceCents: course.price_cents,
      isPublished: course.is_published,
      archivedAt: course.archived_at,
      accessMode: course.access_mode,
    });
    fullContent = access.fullContent;
  }

  const { data: modules, error: modulesError } = await client
    .from("course_modules")
    .select("*, course_lessons(*)")
    .eq("course_id", courseId)
    .order("sort_order");
  if (modulesError) throw modulesError;
  const tree = {
    ...course,
    modules: (modules ?? []).map((module) => ({
      ...module,
      course_lessons: [...(module.course_lessons ?? [])].sort(
        (a, b) => a.sort_order - b.sort_order
      ),
    })),
  };
  if (fullContent) return tree;
  // redact expects the room API's course_modules key; this API uses modules
  const redacted = redactCourseTreeForAccess(
    { ...tree, course_modules: tree.modules } as Record<string, unknown>,
    false
  );
  return {
    ...tree,
    modules: (redacted as { course_modules?: typeof tree.modules }).course_modules ?? tree.modules,
  };
}


export async function saveQuiz(input: { userId: string; courseId: string; lessonId: string; title: string; questions: unknown[]; passScore?: number }) {
  await assertCreator(input.courseId, input.userId);
  const { data: lesson } = await db()
    .from("course_lessons")
    .select("id")
    .eq("id", input.lessonId)
    .eq("course_id", input.courseId)
    .maybeSingle();
  if (!lesson) throw new Error("Lesson not found");
  const { data, error } = await db().from("course_quizzes").upsert({
    course_id: input.courseId, lesson_id: input.lessonId, title: input.title,
    questions: input.questions, pass_score: input.passScore ?? 70, updated_at: new Date().toISOString(),
  }, { onConflict: "lesson_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function submitQuiz(input: { userId: string; quizId: string; answers: unknown[]; courseId?: string }) {
  const { data: quiz, error } = await db().from("course_quizzes").select("*").eq("id", input.quizId).maybeSingle();
  if (error) throw error;
  if (!quiz) throw new Error("Quiz not found");
  if (input.courseId && quiz.course_id !== input.courseId) {
    throw new Error("Quiz does not belong to this course");
  }
  const { data: course } = await db()
    .from("community_courses")
    .select("room_id, creator_id")
    .eq("id", quiz.course_id)
    .maybeSingle();
  if (course?.creator_id !== input.userId) {
    const { getActiveEnrollment } = await import("@/lib/community/courses/access");
    const enrollment = await getActiveEnrollment(quiz.course_id, input.userId);
    if (!enrollment) throw new Error("No access");
  }
  const questions = Array.isArray(quiz.questions) ? quiz.questions as Array<{ correctAnswer?: unknown; answer?: unknown }> : [];
  const submitted = Array.isArray(input.answers) ? input.answers : [];
  const correct = questions.reduce((total, question, index) => total + Number(JSON.stringify(submitted[index]) === JSON.stringify(question.correctAnswer ?? question.answer)), 0);
  const score = questions.length ? Number(((correct / questions.length) * 100).toFixed(2)) : 0;
  const { data, error: insertError } = await db().from("course_quiz_attempts").insert({
    quiz_id: input.quizId, user_id: input.userId, score, passed: score >= Number(quiz.pass_score), answers: submitted,
  }).select().single();
  if (insertError) throw insertError;
  return data;
}

export async function getProgress(courseId: string, userId: string) {
  const [{ data: lessons, error }, { data: progress, error: progressError }] = await Promise.all([
    db().from("course_lessons").select("id").eq("course_id", courseId),
    db().from("lesson_progress").select("*").eq("course_id", courseId).eq("user_id", userId),
  ]);
  if (error || progressError) throw error ?? progressError;
  const completed = (progress ?? []).filter((item) => item.is_completed).length;
  return { lessons: lessons?.length ?? 0, completed, percent: lessons?.length ? Math.round((completed / lessons.length) * 100) : 0, progress: progress ?? [] };
}

export async function issueCertificate(courseId: string, userId: string) {
  const { data: course, error: courseError } = await db()
    .from("community_courses")
    .select("id, certificate_enabled, is_published, creator_id, room_id, title")
    .eq("id", courseId)
    .maybeSingle();
  if (courseError) throw courseError;
  if (!course) throw new Error("Course not found");
  if (!course.certificate_enabled) throw new Error("Certificates are not enabled");
  if (!course.is_published && course.creator_id !== userId) {
    throw new Error("Course is not published");
  }
  if (course.creator_id !== userId) {
    const { getActiveEnrollment } = await import("@/lib/community/courses/access");
    const enrollment = await getActiveEnrollment(courseId, userId);
    if (!enrollment) throw new Error("No access");
  }
  const progress = await getProgress(courseId, userId);
  const [{ data: quizzes }, { data: attempts }, { data: assignments }, { data: submissions }] =
    await Promise.all([
      db().from("course_quizzes").select("id").eq("course_id", courseId),
      db().from("course_quiz_attempts").select("quiz_id, passed").eq("user_id", userId),
      db().from("course_assignments").select("id, required, pass_score").eq("course_id", courseId),
      db()
        .from("course_assignment_submissions")
        .select("assignment_id, status, score")
        .eq("course_id", courseId)
        .eq("user_id", userId),
    ]);
  const { completionSatisfied } = await import("@/lib/community/courses/rules");
  const requiredAssignments = (assignments ?? []).filter((row) => row.required !== false);
  const passedAssignments = requiredAssignments
    .filter((row) => {
      const submission = (submissions ?? []).find((item) => item.assignment_id === row.id);
      return (
        submission?.status === "graded" &&
        Number(submission.score ?? 0) >= Number(row.pass_score ?? 70)
      );
    })
    .map((row) => row.id);
  const quizIds = (quizzes ?? []).map((row) => row.id);
  const passedQuizIds = quizIds.filter((id) =>
    (attempts ?? []).some((attempt) => attempt.quiz_id === id && attempt.passed)
  );
  const completion = completionSatisfied({
    lessonCount: progress.lessons,
    completedLessons: progress.completed,
    quizIds,
    passedQuizIds,
    requiredAssignmentIds: requiredAssignments.map((row) => row.id),
    passedAssignmentIds: passedAssignments,
  });
  if (!completion.ok) throw new Error(completion.reason ?? "Requirements not met");

  const { data: existing } = await db()
    .from("course_certificates")
    .select("*")
    .eq("course_id", courseId)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db()
    .from("course_certificates")
    .insert({
      course_id: courseId,
      user_id: userId,
      certificate_code: `JMV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    })
    .select()
    .single();
  if (error) throw error;

  try {
    const { notifyCertificateIssued } = await import("@/lib/notifications/publishers");
    await notifyCertificateIssued({
      userId,
      courseId,
      certificateCode: data.certificate_code,
      courseTitle: (course as { title?: string } | null)?.title,
    });
  } catch (err) {
    console.warn("[issueCertificate] notification skipped:", err);
  }

  return data;
}

export async function studentDashboard(userId: string) {
  const { data: progress, error } = await db().from("lesson_progress").select("course_id, is_completed, course:community_courses(id, title, thumbnail_url, is_published)").eq("user_id", userId);
  if (error) throw error;
  const courses = new Map<string, { course: unknown; lessons: number; completed: number }>();
  for (const item of progress ?? []) {
    const current = courses.get(item.course_id) ?? { course: item.course, lessons: 0, completed: 0 };
    current.lessons += 1; current.completed += item.is_completed ? 1 : 0; courses.set(item.course_id, current);
  }
  return [...courses.entries()].map(([courseId, item]) => ({ courseId, ...item, percent: item.lessons ? Math.round((item.completed / item.lessons) * 100) : 0 }));
}
