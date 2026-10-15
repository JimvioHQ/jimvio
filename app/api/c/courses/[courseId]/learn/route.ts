import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { assertCourseAccess } from "@/lib/community/courses/access";
import { getProgress, submitQuiz } from "@/services/creator-economy/courses";

export const dynamic = "force-dynamic";

function stripQuestions(questions: unknown) {
  if (!Array.isArray(questions)) return [];
  return questions.map((question) => {
    if (!question || typeof question !== "object") return question;
    const copy = { ...(question as Record<string, unknown>) };
    delete copy.correctAnswer;
    delete copy.answer;
    return copy;
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  const admin = createServiceRoleClient();
  const { data: course } = await admin.from("community_courses").select("*").eq("id", courseId).maybeSingle();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const access = await assertCourseAccess({
    userId: user.id,
    roomId: course.room_id,
    courseId,
    communityId: course.community_id,
    creatorId: course.creator_id,
    priceCents: course.price_cents,
    isPublished: course.is_published,
    archivedAt: course.archived_at,
    accessMode: course.access_mode,
  });
  if (!access.fullContent) {
    return NextResponse.json({ error: "Enroll to open this course" }, { status: 403 });
  }

  const [{ data: modules }, { data: quizzes }, { data: assignments }, { data: submissions }, progress] =
    await Promise.all([
      admin
        .from("course_modules")
        .select("*, course_lessons(*)")
        .eq("course_id", courseId)
        .order("sort_order"),
      admin.from("course_quizzes").select("*").eq("course_id", courseId),
      admin.from("course_assignments").select("*").eq("course_id", courseId),
      admin
        .from("course_assignment_submissions")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", user.id),
      getProgress(courseId, user.id),
    ]);

  const safeQuizzes = (quizzes ?? []).map((quiz) => ({
    ...quiz,
    questions: access.isStaff ? quiz.questions : stripQuestions(quiz.questions),
  }));

  return NextResponse.json({
    course,
    modules: modules ?? [],
    quizzes: safeQuizzes,
    assignments: assignments ?? [],
    submissions: submissions ?? [],
    progress,
    access,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { courseId } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const admin = createServiceRoleClient();
  const { data: course } = await admin
    .from("community_courses")
    .select("room_id, community_id, creator_id, price_cents, is_published, archived_at, access_mode")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  const access = await assertCourseAccess({
    userId: user.id,
    roomId: course.room_id,
    courseId,
    communityId: course.community_id,
    creatorId: course.creator_id,
    priceCents: course.price_cents,
    isPublished: course.is_published,
    archivedAt: course.archived_at,
    accessMode: course.access_mode,
  });
  if (!access.fullContent) return NextResponse.json({ error: "No access" }, { status: 403 });

  try {
    if (body.action === "quiz") {
      const attempt = await submitQuiz({
        userId: user.id,
        quizId: String(body.quizId ?? ""),
        answers: Array.isArray(body.answers) ? body.answers : [],
        courseId,
      });
      return NextResponse.json({ attempt });
    }
    if (body.action === "assignment") {
      const assignmentId = String(body.assignmentId ?? "");
      const text = String(body.body ?? "").trim();
      if (!assignmentId || text.length < 2) {
        return NextResponse.json({ error: "Write your submission" }, { status: 400 });
      }
      const { data: assignment } = await admin
        .from("course_assignments")
        .select("id")
        .eq("id", assignmentId)
        .eq("course_id", courseId)
        .maybeSingle();
      if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      const { data, error } = await admin
        .from("course_assignment_submissions")
        .upsert(
          {
            assignment_id: assignmentId,
            course_id: courseId,
            user_id: user.id,
            body: text,
            status: "submitted",
            score: null,
            feedback: null,
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "assignment_id,user_id" }
        )
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ submission: data });
    }
    if (body.action === "review") {
      const rating = Number(body.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json({ error: "Rating must be 1 to 5" }, { status: 400 });
      }
      const { data, error } = await admin
        .from("course_reviews")
        .upsert(
          {
            course_id: courseId,
            user_id: user.id,
            rating,
            body: typeof body.body === "string" ? body.body.slice(0, 2000) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "course_id,user_id" }
        )
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ review: data });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
