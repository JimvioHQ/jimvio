import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  archiveCourse,
  courseRoster,
  duplicateCourse,
  inviteLearner,
  publishCourse,
  updateCourse,
} from "@/lib/community/courses/manage";
import { upsertLesson, upsertModule, saveQuiz } from "@/services/creator-economy/courses";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

async function userId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await userId();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  try {
    const roster = await courseRoster(user, courseId);
    const { listCourseTree } = await import("@/services/creator-economy/courses");
    const course = await listCourseTree(courseId, user);
    const admin = createServiceRoleClient();
    const [{ data: quizzes }, { data: assignments }] = await Promise.all([
      admin.from("course_quizzes").select("id, lesson_id, title, pass_score, questions").eq("course_id", courseId),
      admin.from("course_assignments").select("*").eq("course_id", courseId),
    ]);
    return NextResponse.json({ course, roster, quizzes: quizzes ?? [], assignments: assignments ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Not found";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const user = await userId();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    if (action === "update") {
      return NextResponse.json({ course: await updateCourse(user, courseId, body) });
    }
    if (action === "publish") {
      return NextResponse.json({ course: await publishCourse(user, courseId, true) });
    }
    if (action === "unpublish") {
      return NextResponse.json({ course: await publishCourse(user, courseId, false) });
    }
    if (action === "archive") {
      return NextResponse.json({ course: await archiveCourse(user, courseId) });
    }
    if (action === "duplicate") {
      const id = await duplicateCourse(user, courseId);
      return NextResponse.json({ courseId: id });
    }
    if (action === "module") {
      return NextResponse.json({
        module: await upsertModule({
          userId: user,
          courseId,
          id: typeof body.id === "string" ? body.id : undefined,
          title: String(body.title ?? "Module"),
          description: typeof body.description === "string" ? body.description : undefined,
          sortOrder: Number(body.sortOrder ?? 0),
        }),
      });
    }
    if (action === "lesson") {
      return NextResponse.json({
        lesson: await upsertLesson({
          userId: user,
          courseId,
          moduleId: String(body.moduleId ?? ""),
          id: typeof body.id === "string" ? body.id : undefined,
          title: String(body.title ?? "Lesson"),
          body: typeof body.body === "string" ? body.body : undefined,
          videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : undefined,
          duration: Number(body.duration ?? 0),
          sortOrder: Number(body.sortOrder ?? 0),
          isFree: Boolean(body.isFree),
          attachments: Array.isArray(body.attachments) ? body.attachments : [],
        }),
      });
    }
    if (action === "quiz") {
      const questions = Array.isArray(body.questions) ? body.questions : [];
      if (!questions.length) return NextResponse.json({ error: "Add at least one question" }, { status: 400 });
      return NextResponse.json({
        quiz: await saveQuiz({
          userId: user,
          courseId,
          lessonId: String(body.lessonId ?? ""),
          title: String(body.title ?? "Quiz"),
          questions,
          passScore: Number(body.passScore ?? 70),
        }),
      });
    }
    if (action === "assignment") {
      const { loadManaged } = await import("./guard");
      await loadManaged(user, courseId);
      const admin = createServiceRoleClient();
      const payload = {
        course_id: courseId,
        lesson_id: typeof body.lessonId === "string" ? body.lessonId : null,
        title: String(body.title ?? "").trim(),
        instructions: typeof body.instructions === "string" ? body.instructions : null,
        required: body.required !== false,
        pass_score: Number(body.passScore ?? 70),
        updated_at: new Date().toISOString(),
      };
      if (payload.title.length < 2) {
        return NextResponse.json({ error: "Assignment title is required" }, { status: 400 });
      }
      const query = typeof body.id === "string"
        ? admin.from("course_assignments").update(payload).eq("id", body.id).eq("course_id", courseId)
        : admin.from("course_assignments").insert(payload);
      const { data, error } = await query.select("*").single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ assignment: data });
    }
    if (action === "grade") {
      const { loadManaged } = await import("./guard");
      await loadManaged(user, courseId);
      const score = Number(body.score);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return NextResponse.json({ error: "Score must be between 0 and 100" }, { status: 400 });
      }
      const admin = createServiceRoleClient();
      const { data: existing } = await admin
        .from("course_assignment_submissions")
        .select("id, user_id")
        .eq("id", String(body.submissionId ?? ""))
        .eq("course_id", courseId)
        .maybeSingle();
      if (!existing) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
      if (existing.user_id === user) {
        return NextResponse.json({ error: "You cannot grade your own submission" }, { status: 403 });
      }
      const { data, error } = await admin
        .from("course_assignment_submissions")
        .update({
          score,
          feedback: typeof body.feedback === "string" ? body.feedback : null,
          status: "graded",
          graded_by: user,
          graded_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", String(body.submissionId ?? ""))
        .eq("course_id", courseId)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ submission: data });
    }
    if (action === "invite") {
      const learnerId = String(body.userId ?? "");
      if (!learnerId) return NextResponse.json({ error: "userId required" }, { status: 400 });
      const enrollment = await inviteLearner({ actorId: user, courseId, userId: learnerId });
      return NextResponse.json({ enrollment });
    }
    if (action === "roster") {
      return NextResponse.json({ roster: await courseRoster(user, courseId) });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    const status = message === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
