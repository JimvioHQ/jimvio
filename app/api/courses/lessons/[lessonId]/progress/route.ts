import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canAccessRoom } from "@/services/accessControl";
import { rateLimit } from "@/lib/ops/rate-limit";

export const dynamic = "force-dynamic";

/**
 * POST — save lesson progress.
 * Body: {
 *   watchTime?: number,
 *   lastPositionSeconds?: number,
 *   completed?: boolean  // default false for heartbeats; true to mark complete
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`course-progress:${user.id}`, 120, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Too many progress updates" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    watchTime?: number;
    lastPositionSeconds?: number;
    completed?: boolean;
  };

  const admin = createServiceRoleClient();
  const { data: lesson } = await admin
    .from("course_lessons")
    .select("course_id, module_id, is_free, duration")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data: course } = await admin
    .from("community_courses")
    .select("room_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course?.room_id) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, course.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { data: existing } = await admin
    .from("lesson_progress")
    .select("is_completed, watch_time, last_position_seconds, completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  const markComplete = body.completed === true;
  const watchTime = Math.max(
    Number(existing?.watch_time ?? 0),
    typeof body.watchTime === "number" && body.watchTime >= 0
      ? Math.floor(body.watchTime)
      : 0
  );
  const lastPosition =
    typeof body.lastPositionSeconds === "number" && body.lastPositionSeconds >= 0
      ? Math.floor(body.lastPositionSeconds)
      : Math.max(Number(existing?.last_position_seconds ?? 0), watchTime);

  const now = new Date().toISOString();
  const isCompleted = Boolean(existing?.is_completed) || markComplete;

  const { error } = await admin.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: lesson.course_id,
      is_completed: isCompleted,
      completed_at: isCompleted
        ? (existing?.completed_at ?? now)
        : null,
      watch_time: watchTime,
      last_position_seconds: lastPosition,
      updated_at: now,
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // First-time completion → lesson completed notification
  if (markComplete && !existing?.is_completed) {
    try {
      const { data: lessonMeta } = await admin
        .from("course_lessons")
        .select("title")
        .eq("id", lessonId)
        .maybeSingle();
      const { notifyLessonCompleted } = await import("@/lib/notifications/publishers");
      await notifyLessonCompleted({
        userId: user.id,
        courseId: lesson.course_id,
        lessonId,
        lessonTitle: (lessonMeta as { title?: string } | null)?.title,
      });
    } catch (err) {
      console.warn("[lesson-progress] notification skipped:", err);
    }
  }

  return NextResponse.json({
    completed: isCompleted,
    watchTime,
    lastPositionSeconds: lastPosition,
  });
}
