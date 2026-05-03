import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canAccessRoom } from "@/services/accessControl";

export const dynamic = "force-dynamic";

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

  const { watchTime } = (await req.json()) as { watchTime?: number };

  const { data: lesson } = await supabase
    .from("course_lessons")
    .select("course_id, module_id")
    .eq("id", lessonId)
    .maybeSingle();

  if (!lesson) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const { data: course } = await supabase
    .from("community_courses")
    .select("room_id")
    .eq("id", lesson.course_id)
    .maybeSingle();

  if (!course?.room_id) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const hasAccess = await canAccessRoom(user.id, course.room_id);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const { error } = await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      course_id: lesson.course_id,
      is_completed: true,
      completed_at: new Date().toISOString(),
      watch_time: watchTime ?? 0,
    },
    { onConflict: "user_id,lesson_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ completed: true });
}
