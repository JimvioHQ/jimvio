import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { canAccessRoom } from "@/services/accessControl";
import { getUserMembership } from "@/services/communityService";
import {
  assertCourseAccess,
  redactCourseTreeForAccess,
} from "@/lib/community/courses/access";

export const dynamic = "force-dynamic";

const COURSE_SELECT = `
  *,
  course_modules (
    id,
    title,
    description,
    sort_order,
    is_free,
    created_at,
    course_lessons (
      id,
      module_id,
      course_id,
      title,
      body,
      video_url,
      duration,
      sort_order,
      is_free,
      attachments,
      created_at,
      updated_at
    )
  )
`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await canAccessRoom(user.id, roomId);
  if (!hasAccess) return NextResponse.json({ error: "No access" }, { status: 403 });

  const admin = createServiceRoleClient();
  let { data: course, error } = await admin
    .from("community_courses")
    .select(COURSE_SELECT)
    .eq("room_id", roomId)
    .limit(1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (!course) {
    const { data: room } = await admin
      .from("rooms")
      .select("id, name, community_id, room_type")
      .eq("id", roomId)
      .maybeSingle();

    if (!room || room.room_type !== "course") {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const { data: community } = await admin
      .from("communities")
      .select("owner_id")
      .eq("id", room.community_id)
      .maybeSingle();
    const membership = await getUserMembership(user.id, room.community_id);
    const staffRoles = new Set(["owner", "admin", "moderator", "creator"]);
    const canSeedCourse =
      community?.owner_id === user.id ||
      (membership?.status === "active" && staffRoles.has(membership.role ?? ""));

    if (canSeedCourse) {
      const { data: existing } = await admin
        .from("community_courses")
        .select("id")
        .eq("room_id", roomId)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { error: insertErr } = await admin.from("community_courses").insert({
          room_id: room.id,
          community_id: room.community_id,
          creator_id: community?.owner_id ?? user.id,
          title: room.name?.trim() || "Course",
          description: null,
          is_published: false,
        });
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 });
      }

      const seeded = await admin
        .from("community_courses")
        .select(COURSE_SELECT)
        .eq("room_id", roomId)
        .limit(1)
        .maybeSingle();
      course = seeded.data;
      if (seeded.error) return NextResponse.json({ error: seeded.error.message }, { status: 400 });
    }
  }

  if (!course) {
    return NextResponse.json({ course: null });
  }

  const access = await assertCourseAccess({
    userId: user.id,
    roomId,
    courseId: course.id as string,
    communityId: course.community_id as string,
    creatorId: course.creator_id as string,
    priceCents: (course as { price_cents?: number | null }).price_cents,
    isPublished: course.is_published as boolean | null,
    archivedAt: (course as { archived_at?: string | null }).archived_at,
  });

  const safeCourse = redactCourseTreeForAccess(
    course as Record<string, unknown>,
    access.fullContent
  );

  // Sort modules/lessons for stable resume ordering.
  const modules = Array.isArray(
    (safeCourse as { course_modules?: unknown[] }).course_modules
  )
    ? [...((safeCourse as { course_modules: Array<Record<string, unknown>> }).course_modules)]
        .sort(
          (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
        )
        .map((mod) => ({
          ...mod,
          course_lessons: Array.isArray(mod.course_lessons)
            ? [...(mod.course_lessons as Array<Record<string, unknown>>)].sort(
                (a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)
              )
            : [],
        }))
    : [];

  return NextResponse.json({
    course: { ...safeCourse, course_modules: modules },
    access: {
      fullContent: access.fullContent,
      isStaff: access.isStaff,
      isFreeCourse: access.isFreeCourse,
      enrolled: Boolean(access.enrollment),
      enrollmentId: access.enrollment?.id ?? null,
    },
  });
}
