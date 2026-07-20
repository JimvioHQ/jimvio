import { createServiceRoleClient } from "@/lib/supabase/service-role";

function db() { return createServiceRoleClient(); }

async function assertCreator(courseId: string, userId: string) {
  const { data, error } = await db().from("community_courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw error;
  if (!data || data.creator_id !== userId) throw new Error("Forbidden");
  return data;
}

export async function upsertModule(input: { userId: string; courseId: string; id?: string; title: string; description?: string; sortOrder?: number; isFree?: boolean }) {
  await assertCreator(input.courseId, input.userId);
  const payload = { course_id: input.courseId, title: input.title, description: input.description ?? null, sort_order: input.sortOrder ?? 0, is_free: Boolean(input.isFree) };
  const query = input.id ? db().from("course_modules").update(payload).eq("id", input.id) : db().from("course_modules").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function upsertLesson(input: { userId: string; courseId: string; moduleId: string; id?: string; title: string; body?: string; videoUrl?: string; duration?: number; sortOrder?: number; isFree?: boolean; attachments?: unknown[] }) {
  await assertCreator(input.courseId, input.userId);
  const payload = { course_id: input.courseId, module_id: input.moduleId, title: input.title, body: input.body ?? null, video_url: input.videoUrl ?? null, duration: input.duration ?? 0, sort_order: input.sortOrder ?? 0, is_free: Boolean(input.isFree), attachments: input.attachments ?? [] };
  const query = input.id ? db().from("course_lessons").update(payload).eq("id", input.id) : db().from("course_lessons").insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function listCourseTree(courseId: string, userId?: string) {
  const client = db();
  const { data: course, error } = await client.from("community_courses").select("*").eq("id", courseId).maybeSingle();
  if (error) throw error;
  if (!course) throw new Error("Course not found");
  if (!course.is_published && course.creator_id !== userId) throw new Error("Course is not published");
  const { data: modules, error: modulesError } = await client.from("course_modules").select("*, course_lessons(*)").eq("course_id", courseId).order("sort_order");
  if (modulesError) throw modulesError;
  return { ...course, modules: (modules ?? []).map((module) => ({ ...module, course_lessons: [...(module.course_lessons ?? [])].sort((a, b) => a.sort_order - b.sort_order) })) };
}

export async function saveQuiz(input: { userId: string; courseId: string; lessonId: string; title: string; questions: unknown[]; passScore?: number }) {
  await assertCreator(input.courseId, input.userId);
  const { data, error } = await db().from("course_quizzes").upsert({
    course_id: input.courseId, lesson_id: input.lessonId, title: input.title,
    questions: input.questions, pass_score: input.passScore ?? 70, updated_at: new Date().toISOString(),
  }, { onConflict: "lesson_id" }).select().single();
  if (error) throw error;
  return data;
}

export async function submitQuiz(input: { userId: string; quizId: string; answers: unknown[] }) {
  const { data: quiz, error } = await db().from("course_quizzes").select("*").eq("id", input.quizId).maybeSingle();
  if (error) throw error;
  if (!quiz) throw new Error("Quiz not found");
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
  const course = await assertCreator(courseId, userId).catch(async () => db().from("community_courses").select("*").eq("id", courseId).single().then((r) => r.data));
  if (!course?.certificate_enabled) throw new Error("Certificates are not enabled");
  const progress = await getProgress(courseId, userId);
  if (!progress.lessons || progress.completed !== progress.lessons) throw new Error("Complete all lessons first");
  const { data, error } = await db().from("course_certificates").upsert({
    course_id: courseId, user_id: userId, certificate_code: `JMV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
  }, { onConflict: "course_id,user_id" }).select().single();
  if (error) throw error;
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
